/**
 * Walking one day of ci.yml history for confirmed same-SHA fail-then-pass.
 *
 * This is the expensive half of the detector, and it runs once a night on
 * main rather than on every push. A weekday is about 500–800 completed
 * ci.yml runs (a weekend is a few dozen), under the 1000-result
 * listWorkflowRuns ceiling. Candidate runs are re-runs and second runs of
 * the same commit; their jobs are read with the REST jobs API. Measured on
 * 2026-11-12 (579 runs, 74 re-runs) that costs a few hundred requests, inside
 * the ~1000 REST requests GITHUB_TOKEN allows per hour.
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
  attemptJobFromApi,
  candidateShaGroupsNewestFirst,
  classifyBatchFailure,
  classifyLoglessJob,
  confirmedFailThenPassJobs,
  groupRunsByHeadSha,
  jobListTruncated,
  listedWorkflowRunFromApi,
  parseJestFailPaths,
  type AttemptJob,
  type ConfirmedFailThenPassJob,
  type ListedWorkflowRun,
  type UnattributedRerun,
} from './flaky-same-sha-history';
import type { DayHit } from './flaky-history-index';

type Octokit = ReturnType<typeof getOctokit>;

export const WORKFLOW = 'ci.yml';

/** listWorkflowRuns serves at most 1000 results per query, day bucket or not. */
const MAX_RUNS_PER_DAY = 1000;

const RUNS_PAGE_SIZE = 100;
const JOBS_PAGE_SIZE = 100;
const DOWNLOAD_CONCURRENCY = 8;

/**
 * REST requests measured for a heavy weekday: listing ~600–800 runs plus
 * about two job pages for each re-run. The per-day cap sits above this so
 * that day can finish. The build cap stays under the 1000-request hourly
 * limit, leaving room for the prior-artifact lookup, log downloads, and
 * retries.
 */
export const HEAVY_DAY_REST_REQUESTS = 350;

/**
 * One heavy day fits in this, and two of them fit in the build budget. A
 * third day waits for the next night instead of taking a share too small
 * to finish.
 */
export const MAX_REST_REQUESTS_PER_DAY = 400;

export const MAX_REST_REQUESTS_PER_BUILD = 800;

/** REST allows ~1000 requests per hour; confirmed fail-then-pass jobs are rare. */
export const MAX_LOG_FETCHES_PER_BUILD = 300;

/** Shared across every day in one build, not reset per day. */
export type WalkBudget = {
  restRequests: number;
  logFetches: number;
};

export function newWalkBudget(): WalkBudget {
  return { restRequests: 0, logFetches: 0 };
}

/**
 * How many REST requests the next day may spend.
 *
 * Days are walked one at a time and each may use up to a full heavy day.
 * Dividing the build budget by the number of queued days left every day
 * short of a page of jobs, so none of them ever finished.
 */
export function requestShareForDay({
  spent,
  buildBudget = MAX_REST_REQUESTS_PER_BUILD,
  perDay = MAX_REST_REQUESTS_PER_DAY,
}: {
  spent: number;
  buildBudget?: number;
  perDay?: number;
}): number {
  const remaining = Math.max(0, buildBudget - Math.max(0, spent));
  return Math.min(Math.max(0, perDay), remaining);
}

/**
 * Fresh days first, then gaps, each group oldest to newest.
 *
 * The window only moves forward when a day after `newestDay` is merged.
 * Walking the backlog first let an unfinished gap consume the night and
 * left yesterday unwalked. Within a group, oldest-first fills the range
 * in order so a finished day is not left as a hole behind a newer one.
 */
export function orderDaysForWalk(
  days: readonly string[],
  gapDays: readonly string[],
): string[] {
  const gaps = new Set(gapDays);
  const fresh: string[] = [];
  const repair: string[] = [];
  for (const day of days) {
    if (gaps.has(day)) {
      repair.push(day);
    } else {
      fresh.push(day);
    }
  }
  fresh.sort();
  repair.sort();
  return [...fresh, ...repair];
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

type ListedDay = {
  runs: ListedWorkflowRun[];
  capped: boolean;
  budgetExhausted: boolean;
};

async function listRunsForDay(
  octokit: Octokit,
  owner: string,
  repo: string,
  day: string,
  spend: () => boolean,
): Promise<ListedDay> {
  const runs: ListedWorkflowRun[] = [];
  let page = 1;
  let fetched = 0;
  try {
    while (runs.length < MAX_RUNS_PER_DAY) {
      if (!spend()) {
        return { runs, capped: false, budgetExhausted: true };
      }
      const response = await withRetryOnce(() =>
        octokit.rest.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id: WORKFLOW,
          status: 'completed',
          created: day,
          per_page: RUNS_PAGE_SIZE,
          page,
        }),
      );
      const pageRuns = response.data.workflow_runs ?? [];
      for (const run of pageRuns) {
        runs.push(listedWorkflowRunFromApi(run));
        if (runs.length >= MAX_RUNS_PER_DAY) {
          break;
        }
      }
      fetched += pageRuns.length;
      const total = response.data.total_count;
      const shortPage = pageRuns.length < RUNS_PAGE_SIZE;
      const covered =
        typeof total === 'number' ? fetched >= total : shortPage;
      if (shortPage || covered || runs.length >= MAX_RUNS_PER_DAY) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    if (runs.length === 0) {
      throw error;
    }
    core.warning(
      `listWorkflowRuns ${day} stopped after ${runs.length} run(s): ${(error as Error).message}`,
    );
    return { runs, capped: true, budgetExhausted: false };
  }
  return {
    runs,
    capped: runs.length >= MAX_RUNS_PER_DAY,
    budgetExhausted: false,
  };
}

type JobListResult = {
  jobs: AttemptJob[];
  complete: boolean;
  stopWalk: boolean;
};

async function listAttemptJobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
  day: string,
  spend: () => boolean,
  failedLists: { count: number },
): Promise<JobListResult> {
  const jobs: AttemptJob[] = [];
  let page = 1;
  while (page <= 20) {
    if (!spend()) {
      return { jobs, complete: false, stopWalk: false };
    }
    let totalCount: number | null = null;
    let pageJobs: Parameters<typeof attemptJobFromApi>[0][] = [];
    try {
      const response = await withRetryOnce(() =>
        octokit.rest.actions.listJobsForWorkflowRun({
          owner,
          repo,
          run_id: runId,
          filter: 'all',
          per_page: JOBS_PAGE_SIZE,
          page,
        }),
      );
      totalCount =
        typeof response.data.total_count === 'number'
          ? response.data.total_count
          : null;
      pageJobs = response.data.jobs ?? [];
    } catch (error) {
      failedLists.count += 1;
      const action = classifyBatchFailure({
        status: githubErrorStatus(error),
        failedBatches: failedLists.count,
      });
      core.warning(
        `listJobsForWorkflowRun ${runId} on ${day} ${action === 'stop' ? 'stopping the walk' : 'skipping this run'}: ${(error as Error).message}`,
      );
      return { jobs, complete: false, stopWalk: action === 'stop' };
    }

    for (const job of pageJobs) {
      jobs.push(attemptJobFromApi(job));
    }
    const shortPage = pageJobs.length < JOBS_PAGE_SIZE;
    const pageCoversRun =
      !jobListTruncated(jobs.length, totalCount) &&
      (shortPage || pageJobs.length === 0);
    if (pageCoversRun) {
      return { jobs, complete: true, stopWalk: false };
    }
    if (totalCount !== null && jobs.length >= totalCount) {
      return { jobs, complete: true, stopWalk: false };
    }
    if (pageJobs.length === 0) {
      return { jobs, complete: false, stopWalk: false };
    }
    page += 1;
  }
  return { jobs, complete: false, stopWalk: false };
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
  spend: () => boolean,
): Promise<'infrastructure' | 'missing_blob'> {
  if (!spend()) {
    return 'missing_blob';
  }
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
  budgetExhausted: boolean;
};

async function downloadFailedUnitLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  failedUnitJobs: ConfirmedFailThenPassJob[],
  spend: () => boolean,
): Promise<FailedLogFetch> {
  let budgetExhausted = false;
  const logParts = await mapWithConcurrency(
    failedUnitJobs,
    DOWNLOAD_CONCURRENCY,
    async (
      job,
    ): Promise<
      | { job: ConfirmedFailThenPassJob; ok: true; text: string }
      | { job: ConfirmedFailThenPassJob; ok: false; failure: LogFetchFailure }
    > => {
      if (!spend()) {
        budgetExhausted = true;
        return { job, ok: false, failure: 'unread' };
      }
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
            spend,
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
    budgetExhausted,
  };
}

export type WalkDayInput = {
  octokit: Octokit;
  owner: string;
  repo: string;
  day: string;
  budget: WalkBudget;
  /**
   * Share of the build's REST budget this day may spend. One busy day is
   * allowed to use a full heavy-day share; it must not be handed
   * `budget / daysQueued`, which is what left every day unfinished.
   */
  maxRequestsForDay?: number;
};

/**
 * Every confirmed same-SHA fail-then-pass on one day, with the gaps that
 * prevented it from being exhaustive.
 *
 * `complete: false` is what makes the day a gap the next build re-walks, so it
 * is set for anything that left commits uninspected — a listing cap, an
 * exhausted budget, a job list that stopped before `total_count`, or a
 * request that would not load.
 */
export async function walkDay({
  octokit,
  owner,
  repo,
  day,
  budget,
  maxRequestsForDay = MAX_REST_REQUESTS_PER_BUILD,
}: WalkDayInput): Promise<WalkDayResult> {
  const empty: WalkDayResult = {
    hits: [],
    runsScanned: 0,
    missingLogBlobs: 0,
    infrastructureFailures: 0,
    unattributedReruns: [],
    complete: false,
  };

  let requestsForDay = 0;
  const spend = (): boolean => {
    if (
      budget.restRequests >= MAX_REST_REQUESTS_PER_BUILD ||
      requestsForDay >= maxRequestsForDay
    ) {
      return false;
    }
    budget.restRequests += 1;
    requestsForDay += 1;
    return true;
  };

  let listed: ListedDay;
  try {
    listed = await listRunsForDay(octokit, owner, repo, day, spend);
  } catch (error) {
    core.warning(`listWorkflowRuns ${day} failed: ${(error as Error).message}`);
    return empty;
  }
  if (listed.capped) {
    core.warning(
      `listWorkflowRuns ${day} hit the ${MAX_RUNS_PER_DAY}-result ceiling; part of the day was not listed`,
    );
  }
  if (listed.budgetExhausted) {
    core.warning(`REST budget exhausted while listing ${day}`);
  }

  const candidates = candidateShaGroupsNewestFirst(
    groupRunsByHeadSha(listed.runs),
  );
  const jobsBySha = new Map<string, AttemptJob[]>();
  const seenRunIds = new Set<number>();
  const failedLists = { count: 0 };
  let complete = !listed.capped && !listed.budgetExhausted;
  let stop = false;

  for (const candidate of candidates) {
    if (stop) {
      break;
    }
    for (const run of candidate.runs) {
      if (seenRunIds.has(run.id)) {
        continue;
      }
      seenRunIds.add(run.id);
      const listedJobs = await listAttemptJobs(
        octokit,
        owner,
        repo,
        run.id,
        day,
        spend,
        failedLists,
      );
      const forSha = jobsBySha.get(candidate.headSha) ?? [];
      forSha.push(...listedJobs.jobs);
      jobsBySha.set(candidate.headSha, forSha);
      if (!listedJobs.complete) {
        complete = false;
      }
      if (listedJobs.stopWalk) {
        stop = true;
        break;
      }
      if (
        budget.restRequests >= MAX_REST_REQUESTS_PER_BUILD ||
        requestsForDay >= maxRequestsForDay
      ) {
        // A later candidate was not inspected. The day stays queued.
        const moreRuns = candidates.some((other) =>
          other.runs.some((otherRun) => !seenRunIds.has(otherRun.id)),
        );
        if (moreRuns) {
          core.warning(`REST budget exhausted before finishing ${day}`);
          complete = false;
          stop = true;
          break;
        }
      }
    }
  }

  const hits: DayHit[] = [];
  const unattributedReruns: UnattributedRerun[] = [];
  let missingLogBlobs = 0;
  let infrastructureFailures = 0;

  for (const jobs of jobsBySha.values()) {
    const confirmed = confirmedFailThenPassJobs(jobs);
    if (confirmed.length === 0) {
      continue;
    }

    const remainingLogs = MAX_LOG_FETCHES_PER_BUILD - budget.logFetches;
    if (remainingLogs <= 0) {
      core.warning(`Log fetch budget exhausted before finishing ${day}`);
      complete = false;
      break;
    }
    const toFetch = confirmed.slice(0, remainingLogs);
    if (toFetch.length < confirmed.length) {
      complete = false;
    }
    budget.logFetches += toFetch.length;

    const logs = await downloadFailedUnitLogs(
      octokit,
      owner,
      repo,
      toFetch,
      spend,
    );
    missingLogBlobs += logs.missingBlobCount;
    infrastructureFailures += logs.infrastructureCount;
    unattributedReruns.push(...logs.unattributed);
    if (logs.unreadCount > 0 || logs.budgetExhausted) {
      complete = false;
    }
    for (const hit of allHitsFromConfirmedLogs(toFetch, logs.filesByJobId)) {
      hits.push({
        path: hit.path,
        runId: hit.failRunId,
        jobId: hit.jobId,
      });
    }
    if (logs.budgetExhausted) {
      core.warning(`REST budget exhausted before finishing ${day}`);
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
