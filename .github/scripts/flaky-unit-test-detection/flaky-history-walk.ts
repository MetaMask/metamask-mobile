/**
 * Walking one day of ci.yml history for confirmed same-SHA fail-then-pass.
 *
 * This is the expensive half of the detector, and it now runs once a night on
 * main rather than on every push. A day is small enough to stay clear of every
 * ceiling the per-PR walk kept hitting: roughly 330 runs against the
 * 1000-result listWorkflowRuns cap, and about 33 candidate commits against the
 * 1000 GraphQL points GITHUB_TOKEN allows per hour.
 *
 * Nothing here is scoped to a pull request. The caller gets every unit test
 * the confirmed jobs reported failing, and decides what to do with it.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import {
  githubErrorStatus,
  isMissingLogBlobError,
  isRetriableGithubError,
  withRetryOnce,
} from './flaky-github-request';
import {
  allHitsFromConfirmedLogs,
  buildShaBatchQuery,
  candidateShaGroupsNewestFirst,
  chunkArray,
  classifyBatchFailure,
  classifyLoglessJob,
  collectListedRunsFromPages,
  confirmedFailThenPassJobs,
  groupRunsByHeadSha,
  parseJestFailPaths,
  parseShaBatchResponse,
  type ConfirmedFailThenPassJob,
  type ListedWorkflowRun,
  type UnattributedRerun,
} from './flaky-same-sha-history';
import type { DayHit } from './flaky-history-index';

type Octokit = ReturnType<typeof getOctokit>;

export const WORKFLOW = 'ci.yml';

/** listWorkflowRuns serves at most 1000 results per query, day bucket or not. */
const MAX_RUNS_PER_DAY = 1000;

const GRAPHQL_BATCH_SIZE = 20;
const DOWNLOAD_CONCURRENCY = 8;

/**
 * A 20-SHA batch costs 20 GraphQL points, so points scale with commits
 * inspected rather than with queries. GITHUB_TOKEN allows 1000 points per hour
 * per repository; a nightly single day needs about 33, and a 14-day cold start
 * about 460, which is why the backfill window is 14 days and not the full
 * retention window.
 */
export const MAX_GRAPHQL_QUERIES_PER_BUILD = 40;

/** REST allows 1000 requests per hour; confirmed fail-then-pass jobs are rare. */
export const MAX_LOG_FETCHES_PER_BUILD = 300;

/** Shared across every day in one build, not reset per day. */
export type WalkBudget = {
  graphqlQueries: number;
  logFetches: number;
};

export function newWalkBudget(): WalkBudget {
  return { graphqlQueries: 0, logFetches: 0 };
}

export type WalkDayResult = {
  hits: DayHit[];
  runsScanned: number;
  missingLogBlobs: number;
  infrastructureFailures: number;
  unattributedReruns: UnattributedRerun[];
  /** False when a cap or an error left part of the day uninspected. */
  complete: boolean;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await worker(items[index]);
      }
    })(),
  );
  await Promise.all(runners);
  return results;
}

export async function listRunsForDay(
  octokit: Octokit,
  owner: string,
  repo: string,
  day: string,
): Promise<{ runs: ListedWorkflowRun[]; capped: boolean }> {
  const iterator = octokit.paginate.iterator(
    octokit.rest.actions.listWorkflowRuns,
    {
      owner,
      repo,
      workflow_id: WORKFLOW,
      status: 'completed',
      created: day,
      per_page: 100,
    },
  );
  const { runs, pageErrorMessage } = await collectListedRunsFromPages(
    iterator,
    MAX_RUNS_PER_DAY,
  );
  if (pageErrorMessage) {
    core.warning(
      `listWorkflowRuns ${day} stopped after ${runs.length} run(s): ${pageErrorMessage}`,
    );
  }
  return { runs, capped: runs.length >= MAX_RUNS_PER_DAY };
}

/**
 * GitHub serves the log from Azure behind a redirect, so a 404 alone does not
 * say whether a test failed. The job record does: its steps survive the log.
 */
async function classifyMissingLog(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
): Promise<'infrastructure' | 'missing_blob'> {
  try {
    const { data } = await withRetryOnce(() =>
      octokit.rest.actions.getJobForWorkflowRun({ owner, repo, job_id: jobId }),
    );
    return classifyLoglessJob({ steps: data.steps }) === 'infrastructure'
      ? 'infrastructure'
      : 'missing_blob';
  } catch {
    // Without the job record there is no evidence of a lost runner, so the
    // conservative reading is a real failure whose log is gone.
    return 'missing_blob';
  }
}

type LogFetchFailure = 'missing_blob' | 'infrastructure' | 'unread';

type FailedLogFetch = {
  filesByJobId: Map<number, string[]>;
  unreadCount: number;
  missingBlobCount: number;
  infrastructureCount: number;
  unattributed: UnattributedRerun[];
};

async function downloadFailedUnitLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  failedUnitJobs: ConfirmedFailThenPassJob[],
): Promise<FailedLogFetch> {
  const logParts = await mapWithConcurrency(
    failedUnitJobs,
    DOWNLOAD_CONCURRENCY,
    async (
      job,
    ): Promise<
      | { job: ConfirmedFailThenPassJob; ok: true; text: string }
      | { job: ConfirmedFailThenPassJob; ok: false; failure: LogFetchFailure }
    > => {
      try {
        const res = await withRetryOnce(() =>
          octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.jobId,
          }),
        );
        return { job, ok: true, text: String(res.data) };
      } catch (error) {
        if (isMissingLogBlobError(error)) {
          const failure = await classifyMissingLog(
            octokit,
            owner,
            repo,
            job.jobId,
          );
          core.info(
            `downloadJobLogsForWorkflowRun ${job.jobId} failed: ${
              failure === 'infrastructure'
                ? 'runner did not finish its steps'
                : 'missing log blob'
            }`,
          );
          return { job, ok: false, failure };
        }
        const reason = isRetriableGithubError(error)
          ? 'GitHub API error after retry'
          : (error as Error).message;
        core.info(
          `downloadJobLogsForWorkflowRun ${job.jobId} failed: ${reason}`,
        );
        return { job, ok: false, failure: 'unread' };
      }
    },
  );

  const filesByJobId = new Map<number, string[]>();
  const unattributed: UnattributedRerun[] = [];
  let unreadCount = 0;
  let missingBlobCount = 0;
  let infrastructureCount = 0;
  for (const part of logParts) {
    if (part.ok) {
      filesByJobId.set(part.job.jobId, parseJestFailPaths(part.text));
      continue;
    }
    if (part.failure === 'infrastructure') {
      infrastructureCount += 1;
      continue;
    }
    if (part.failure === 'missing_blob') {
      missingBlobCount += 1;
    } else {
      unreadCount += 1;
    }
    unattributed.push({
      jobName: part.job.name,
      runId: part.job.runId,
      jobId: part.job.jobId,
      reason: part.failure === 'missing_blob' ? 'missing_log' : 'unread',
    });
  }
  return {
    filesByJobId,
    unreadCount,
    missingBlobCount,
    infrastructureCount,
    unattributed,
  };
}

async function fetchShaBatch(
  octokit: Octokit,
  owner: string,
  repo: string,
  shas: string[],
): Promise<ReturnType<typeof parseShaBatchResponse>> {
  const { query, variables } = buildShaBatchQuery(shas, owner, repo);
  const response = await withRetryOnce(() => octokit.graphql(query, variables));
  return parseShaBatchResponse(response, shas);
}

export type WalkDayInput = {
  octokit: Octokit;
  owner: string;
  repo: string;
  day: string;
  budget: WalkBudget;
  /**
   * Share of the build's GraphQL budget this day may spend. A single busy day
   * can produce enough candidate commits to exhaust the whole budget, which
   * would leave every later day unwalked and looking like a gap.
   */
  maxQueriesForDay?: number;
};

/**
 * Every confirmed same-SHA fail-then-pass on one day, with the gaps that
 * prevented it from being exhaustive.
 *
 * `complete: false` is what makes the day a gap the next build re-walks, so it
 * is set for anything that left commits uninspected — a listing cap, an
 * exhausted budget, a truncated GraphQL page, or a batch that would not load.
 */
export async function walkDay({
  octokit,
  owner,
  repo,
  day,
  budget,
  maxQueriesForDay = MAX_GRAPHQL_QUERIES_PER_BUILD,
}: WalkDayInput): Promise<WalkDayResult> {
  const empty: WalkDayResult = {
    hits: [],
    runsScanned: 0,
    missingLogBlobs: 0,
    infrastructureFailures: 0,
    unattributedReruns: [],
    complete: false,
  };

  let listed: { runs: ListedWorkflowRun[]; capped: boolean };
  try {
    listed = await withRetryOnce(() =>
      listRunsForDay(octokit, owner, repo, day),
    );
  } catch (error) {
    core.warning(`listWorkflowRuns ${day} failed: ${(error as Error).message}`);
    return empty;
  }
  if (listed.capped) {
    core.warning(
      `listWorkflowRuns ${day} hit the ${MAX_RUNS_PER_DAY}-result ceiling; part of the day was not listed`,
    );
  }

  const candidates = candidateShaGroupsNewestFirst(
    groupRunsByHeadSha(listed.runs),
  );
  const batches = chunkArray(
    candidates.map((candidate) => candidate.headSha),
    GRAPHQL_BATCH_SIZE,
  );

  const hits: DayHit[] = [];
  const unattributedReruns: UnattributedRerun[] = [];
  let missingLogBlobs = 0;
  let infrastructureFailures = 0;
  let failedBatches = 0;
  let queriesForDay = 0;
  let complete = !listed.capped;
  let stop = false;

  for (const batch of batches) {
    if (
      budget.graphqlQueries >= MAX_GRAPHQL_QUERIES_PER_BUILD ||
      queriesForDay >= maxQueriesForDay
    ) {
      core.warning(`GraphQL budget exhausted before finishing ${day}`);
      complete = false;
      break;
    }

    budget.graphqlQueries += 1;
    queriesForDay += 1;
    let shaResults: ReturnType<typeof parseShaBatchResponse>;
    try {
      shaResults = await fetchShaBatch(octokit, owner, repo, batch);
    } catch (error) {
      failedBatches += 1;
      const status = githubErrorStatus(error);
      const action = classifyBatchFailure({ status, failedBatches });
      core.warning(
        `GraphQL SHA batch for ${day} ${action === 'stop' ? 'stopping the walk' : 'skipping these SHAs'}: ${(error as Error).message}`,
      );
      complete = false;
      if (action === 'stop') {
        break;
      }
      continue;
    }

    for (const shaResult of shaResults) {
      if (shaResult.truncated) {
        core.warning(
          `Check runs for ${shaResult.headSha} were truncated; ${day} is incomplete`,
        );
        complete = false;
      }
      const confirmed = confirmedFailThenPassJobs(shaResult);
      if (confirmed.length === 0) {
        continue;
      }

      const remaining = MAX_LOG_FETCHES_PER_BUILD - budget.logFetches;
      if (remaining <= 0) {
        core.warning(`Log fetch budget exhausted before finishing ${day}`);
        complete = false;
        // No later batch can read a log either, so stop spending GraphQL on
        // commits this day can no longer judge.
        stop = true;
        break;
      }
      const toFetch = confirmed.slice(0, remaining);
      if (toFetch.length < confirmed.length) {
        complete = false;
      }
      budget.logFetches += toFetch.length;

      const logs = await downloadFailedUnitLogs(octokit, owner, repo, toFetch);
      missingLogBlobs += logs.missingBlobCount;
      infrastructureFailures += logs.infrastructureCount;
      unattributedReruns.push(...logs.unattributed);
      // An unread log is a commit we could not judge, so the day is not done.
      if (logs.unreadCount > 0) {
        complete = false;
      }
      for (const hit of allHitsFromConfirmedLogs(toFetch, logs.filesByJobId)) {
        hits.push({
          path: hit.path,
          runId: hit.failRunId,
          jobId: hit.jobId,
        });
      }
    }

    if (stop) {
      break;
    }
  }

  return {
    hits,
    runsScanned: listed.runs.length,
    missingLogBlobs,
    infrastructureFailures,
    unattributedReruns,
    complete,
  };
}
