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
  attemptJobFromApi,
  candidateShaGroupsNewestFirst,
  classifyLoglessJob,
  confirmedFailThenPassFromAttemptJobs,
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
 * Job lists for a ci.yml run take seconds each (a run carries well over a
 * hundred jobs), so walking them one at a time spent the whole nightly on a
 * single weekday. They are independent reads, and the REST request budget is
 * counted per call, so running several at once changes the time, not the cost.
 */
const JOB_LIST_CONCURRENCY = 6;

/**
 * Some ci.yml runs answer their job list with a 5xx every time, on every
 * night, and nothing a re-walk does will read them. Treating each as an
 * incomplete day kept the same days queued forever, so a handful per day are
 * skipped and named in the log instead. Past this many the failures look like
 * an outage rather than a few bad runs, and the walk stops with the day left
 * queued.
 */
export const MAX_UNREADABLE_RUNS_PER_DAY = 10;

export const HEAVY_DAY_REST_REQUESTS = 350;

export const MAX_REST_REQUESTS_PER_DAY = 400;

export const MAX_REST_REQUESTS_PER_BUILD = 800;

/** REST allows 1000 requests per hour; confirmed fail-then-pass jobs are rare. */
export const MAX_LOG_FETCHES_PER_BUILD = 300;

/**
 * Wall-clock the walk may use before it stops starting work. The job's own
 * timeout is 60 minutes and cancels the step without publishing anything, so
 * the walk has to give up early enough to write and publish what it has.
 */
export const DEFAULT_WALK_DEADLINE_MINUTES = 40;

/**
 * Days one build attempts. A heavy weekday costs several minutes of API time on
 * its own, so a night that is behind catches up over several builds instead of
 * walking everything and never saving.
 */
export const MAX_DAYS_PER_BUILD = 5;

/** Shared across every day in one build, not reset per day. */
export type WalkBudget = {
  restRequests: number;
  logFetches: number;
};

export function newWalkBudget(): WalkBudget {
  return { restRequests: 0, logFetches: 0 };
}

export function requestShareForDay({
  spent,
  buildBudget = MAX_REST_REQUESTS_PER_BUILD,
  perDay = MAX_REST_REQUESTS_PER_DAY,
  minToStart = HEAVY_DAY_REST_REQUESTS,
}: {
  spent: number;
  buildBudget?: number;
  perDay?: number;
  minToStart?: number;
}): number {
  const remaining = Math.max(0, buildBudget - Math.max(0, spent));
  const share = Math.min(Math.max(0, perDay), remaining);
  if (share < minToStart) {
    return 0;
  }
  return share;
}

/**
 * Newest first, fresh days ahead of gap repairs. The days a build cannot reach
 * are the oldest ones, which become gaps for a later night, so the index's
 * newest day keeps tracking yesterday and PR comments stay fresh.
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
  fresh.sort().reverse();
  repair.sort().reverse();
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
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await worker(items[index], index);
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
  listingFailed: boolean;
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
        return {
          runs,
          capped: false,
          budgetExhausted: true,
          listingFailed: false,
        };
      }
      const response = await withRetryOnce(
        () =>
          octokit.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: WORKFLOW,
            status: 'completed',
            created: day,
            per_page: RUNS_PAGE_SIZE,
            page,
          }),
        undefined,
        spend,
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
      const covered = typeof total === 'number' ? fetched >= total : shortPage;
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
    return {
      runs,
      capped: runs.length >= MAX_RUNS_PER_DAY,
      budgetExhausted: false,
      listingFailed: true,
    };
  }
  return {
    runs,
    capped: runs.length >= MAX_RUNS_PER_DAY,
    budgetExhausted: false,
    listingFailed: false,
  };
}

/**
 * GitHub answers the second 100-job page of some ci.yml runs with a 500 on
 * every attempt, while the same jobs read fine in smaller pages. Those runs
 * were the reason most recent days could never be walked to the end.
 */
const JOBS_FALLBACK_PAGE_SIZE = 25;

class RequestBudgetSpent extends Error {}

type JobsPage = {
  total: number | null;
  jobs: Parameters<typeof attemptJobFromApi>[0][];
};

async function fetchJobsPage({
  octokit,
  owner,
  repo,
  runId,
  page,
  spend,
}: {
  octokit: Octokit;
  owner: string;
  repo: string;
  runId: number;
  page: number;
  spend: () => boolean;
}): Promise<JobsPage> {
  const read = async (perPage: number, pageNumber: number) => {
    const response = await withRetryOnce(
      () =>
        octokit.rest.actions.listJobsForWorkflowRun({
          owner,
          repo,
          run_id: runId,
          filter: 'all',
          per_page: perPage,
          page: pageNumber,
        }),
      undefined,
      spend,
    );
    return {
      total:
        typeof response.data.total_count === 'number'
          ? response.data.total_count
          : null,
      jobs: response.data.jobs ?? [],
    };
  };

  try {
    return await read(JOBS_PAGE_SIZE, page);
  } catch (error) {
    const status = githubErrorStatus(error);
    if (status === undefined || status < 500) {
      throw error;
    }
  }

  const perWindow = JOBS_PAGE_SIZE / JOBS_FALLBACK_PAGE_SIZE;
  const firstSubPage = (page - 1) * perWindow + 1;
  const jobs: JobsPage['jobs'] = [];
  let total: number | null = null;
  for (let offset = 0; offset < perWindow; offset += 1) {
    if (!spend()) {
      throw new RequestBudgetSpent();
    }
    const sub = await read(JOBS_FALLBACK_PAGE_SIZE, firstSubPage + offset);
    total = sub.total;
    jobs.push(...sub.jobs);
    if (sub.jobs.length < JOBS_FALLBACK_PAGE_SIZE) {
      break;
    }
  }
  return { total, jobs };
}

type JobListResult = {
  jobs: AttemptJob[];
  complete: boolean;
  stopWalk: boolean;
  /** The run's job list kept failing with a server error; it was skipped. */
  unreadable?: boolean;
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
    let pageJobs: JobsPage['jobs'] = [];
    try {
      const fetched = await fetchJobsPage({
        octokit,
        owner,
        repo,
        runId,
        page,
        spend,
      });
      totalCount = fetched.total;
      pageJobs = fetched.jobs;
    } catch (error) {
      if (error instanceof RequestBudgetSpent) {
        return { jobs, complete: false, stopWalk: false };
      }
      failedLists.count += 1;
      const status = githubErrorStatus(error);
      const action =
        status === 403 ||
        status === 429 ||
        failedLists.count > MAX_UNREADABLE_RUNS_PER_DAY
          ? 'stop'
          : 'skip';
      core.warning(
        `listJobsForWorkflowRun ${runId} on ${day} ${action === 'stop' ? 'stopping the walk' : 'skipping this run'}: ${(error as Error).message}`,
      );
      return {
        jobs,
        complete: false,
        stopWalk: action === 'stop',
        unreadable: action === 'skip',
      };
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
    const { data } = await withRetryOnce(
      () =>
        octokit.rest.actions.getJobForWorkflowRun({
          owner,
          repo,
          job_id: jobId,
        }),
      undefined,
      spend,
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
        const res = await withRetryOnce(
          () =>
            octokit.rest.actions.downloadJobLogsForWorkflowRun({
              owner,
              repo,
              job_id: job.jobId,
            }),
          undefined,
          spend,
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
  /** Epoch milliseconds after which no further request is started. */
  deadlineMs?: number;
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
  deadlineMs,
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
  const pastDeadline = (): boolean =>
    deadlineMs !== undefined && Date.now() >= deadlineMs;
  const spend = (): boolean => {
    if (
      budget.restRequests >= MAX_REST_REQUESTS_PER_BUILD ||
      requestsForDay >= maxRequestsForDay ||
      pastDeadline()
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
  let complete =
    !listed.capped && !listed.budgetExhausted && !listed.listingFailed;
  let stop = false;

  const queue: { headSha: string; run: ListedWorkflowRun }[] = [];
  for (const candidate of candidates) {
    for (const run of candidate.runs) {
      if (!seenRunIds.has(run.id)) {
        seenRunIds.add(run.id);
        queue.push({ headSha: candidate.headSha, run });
      }
    }
  }

  const listedByTask = await mapWithConcurrency(
    queue,
    JOB_LIST_CONCURRENCY,
    async ({ run }): Promise<JobListResult | null> => {
      if (
        stop ||
        budget.restRequests >= MAX_REST_REQUESTS_PER_BUILD ||
        requestsForDay >= maxRequestsForDay ||
        pastDeadline()
      ) {
        // A later candidate was not inspected. The day stays queued.
        return null;
      }
      const result = await listAttemptJobs(
        octokit,
        owner,
        repo,
        run.id,
        day,
        spend,
        failedLists,
      );
      if (result.stopWalk) {
        stop = true;
      }
      return result;
    },
  );

  // Folded in queue order, so the outcome does not depend on which request
  // happened to answer first.
  let skippedRuns = 0;
  for (const [position, task] of queue.entries()) {
    const result = listedByTask[position];
    if (result === null) {
      skippedRuns += 1;
      continue;
    }
    const forSha = jobsBySha.get(task.headSha) ?? [];
    forSha.push(...result.jobs);
    jobsBySha.set(task.headSha, forSha);
    if (!result.complete && !result.unreadable) {
      complete = false;
    }
  }
  if (skippedRuns > 0) {
    complete = false;
    if (!stop) {
      core.warning(
        `REST budget or walk deadline reached before finishing ${day}`,
      );
    }
  }

  const hits: DayHit[] = [];
  const unattributedReruns: UnattributedRerun[] = [];
  let missingLogBlobs = 0;
  let infrastructureFailures = 0;

  for (const jobs of jobsBySha.values()) {
    const confirmed = confirmedFailThenPassFromAttemptJobs(jobs);
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
