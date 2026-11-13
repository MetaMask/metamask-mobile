/**
 * Same-SHA unit-test fail-then-pass detection.
 *
 * A later commit can change production code or Jest setup and make a test
 * pass, so only an identical head SHA is a "no fix landed" signal. GitHub
 * Re-run jobs (attempt 1 → 2 on one run id) and a second ci.yml run on that
 * commit are both valid; fail on SHA A then pass on SHA B is not.
 *
 * Stage 1 walks an ID-first funnel: list runs, keep SHAs that can be a
 * retry, read that run's jobs across attempts, confirm the same job name
 * later succeeded, then download logs only for those jobs.
 */
import type { CoverageWindow, UnattributedRerun } from './flaky-types';
import type { IndexCoverage } from './flaky-history-index';
import { isFlakyWorkflowUnitTestPath } from './flaky-unit-test-path';

export type { CoverageWindow, UnattributedRerun };

export const UNIT_TEST_JOB_PREFIX = 'Unit tests';

export type ListedWorkflowRun = {
  id: number;
  conclusion: string | null;
  createdAt: string;
  headSha: string;
  runAttempt: number;
};

export type WorkflowRunListItem = {
  id: number;
  conclusion: string | null;
  created_at: string;
  head_sha: string;
  run_attempt?: number;
};

export function listedWorkflowRunFromApi(
  run: WorkflowRunListItem,
): ListedWorkflowRun {
  return {
    id: run.id,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    headSha: run.head_sha,
    // Octokit types run_attempt as optional; a missing value is the first attempt.
    runAttempt: run.run_attempt ?? 1,
  };
}

export type ListedRunsPage = {
  data: WorkflowRunListItem[];
};

export type CollectListedRunsFromPagesResult = {
  runs: ListedWorkflowRun[];
  pageErrorMessage?: string;
};

/**
 * Walks listWorkflowRuns pages. A later-page failure keeps already-listed
 * runs so Stage 1 can still sample instead of failing the job on a mid-walk
 * 429/5xx after `withRetryOnce` restarted from page 1.
 */
export async function collectListedRunsFromPages(
  pages: AsyncIterable<ListedRunsPage>,
  maxRuns: number,
): Promise<CollectListedRunsFromPagesResult> {
  const runs: ListedWorkflowRun[] = [];
  try {
    for await (const { data } of pages) {
      for (const run of data) {
        runs.push(listedWorkflowRunFromApi(run));
        if (runs.length >= maxRuns) {
          return { runs };
        }
      }
    }
  } catch (error) {
    if (runs.length === 0) {
      throw error;
    }
    return {
      runs,
      pageErrorMessage: (error as Error).message,
    };
  }
  return { runs };
}

export type SameShaFileHit = {
  count: number;
  exampleRunUrl: string;
};

export type SameShaLogHit = {
  path: string;
  failRunId: number;
  jobId: number;
};

/** GitHub job log page — `/actions/runs/{runId}/job/{jobId}`, not the workflow-run summary. */
export function jobLogUrl(
  serverUrl: string,
  repo: string,
  runId: number,
  jobId: number,
): string {
  return `${serverUrl}/${repo}/actions/runs/${runId}/job/${jobId}`;
}

export type ConfirmedFailThenPassJob = {
  name: string;
  jobId: number;
  runId: number;
};

export function groupRunsByHeadSha(
  runs: ListedWorkflowRun[],
): Map<string, ListedWorkflowRun[]> {
  const groups = new Map<string, ListedWorkflowRun[]>();
  for (const run of runs) {
    if (!run.headSha) {
      continue;
    }
    const list = groups.get(run.headSha) ?? [];
    list.push(run);
    groups.set(run.headSha, list);
  }
  return groups;
}

/**
 * Whether earlier attempts of one run are all present in the listed rows.
 *
 * `listWorkflowRuns` returns a single row per run id — the latest attempt and
 * its conclusion. A re-run that failed and then passed is therefore one row
 * with `runAttempt > 1` and `conclusion: 'success'`, and the failed attempt is
 * not in the list at all.
 */
function listedAttemptsCover(
  attempts: ListedWorkflowRun[],
  latestAttempt: number,
): boolean {
  const seen = new Set(attempts.map((run) => run.runAttempt));
  for (let attempt = 1; attempt <= latestAttempt; attempt += 1) {
    if (!seen.has(attempt)) {
      return false;
    }
  }
  return true;
}

/**
 * A fail-then-pass needs a failed Unit tests job and a later success of that
 * same job on the identical commit.
 *
 * A listed conclusion of `success` does not prove the first attempt passed.
 * The list endpoint only reports the latest attempt, so a green re-run is
 * kept and the jobs API decides whether an earlier attempt failed. The only
 * re-run skipped here is one whose every attempt is present and succeeded,
 * which the list endpoint does not actually return.
 *
 * A re-run that stayed red is kept too: GitHub concludes the whole run on
 * every job, so "Unit tests passed, lint still failed" looks identical to
 * "nothing passed".
 */
export function isCandidateShaGroup(runsForSha: ListedWorkflowRun[]): boolean {
  const byId = new Map<number, ListedWorkflowRun[]>();
  for (const run of runsForSha) {
    const list = byId.get(run.id) ?? [];
    list.push(run);
    byId.set(run.id, list);
  }

  for (const attempts of byId.values()) {
    const latestAttempt = Math.max(...attempts.map((run) => run.runAttempt));
    if (latestAttempt <= 1) {
      continue;
    }
    const everyAttemptSucceeded =
      listedAttemptsCover(attempts, latestAttempt) &&
      attempts.every((run) => run.conclusion === 'success');
    if (!everyAttemptSucceeded) {
      return true;
    }
  }

  if (!runsForSha.some((run) => run.conclusion === 'failure')) {
    return false;
  }
  if (byId.size < 2) {
    return false;
  }
  return runsForSha.some((run) => run.conclusion === 'success');
}

export function candidateShaGroupsNewestFirst(
  groups: Map<string, ListedWorkflowRun[]>,
): { headSha: string; runs: ListedWorkflowRun[] }[] {
  const candidates = [...groups.entries()]
    .filter(([, runs]) => isCandidateShaGroup(runs))
    .map(([headSha, runs]) => ({ headSha, runs }));

  return candidates.sort((a, b) => {
    const aNewest = Math.max(...a.runs.map((run) => Date.parse(run.createdAt)));
    const bNewest = Math.max(...b.runs.map((run) => Date.parse(run.createdAt)));
    return bNewest - aNewest;
  });
}

/**
 * One job execution from `GET /actions/runs/{run_id}/jobs?filter=all`.
 * `filter=all` is required: the default `latest` drops the failed attempt.
 */
export type AttemptJob = {
  id: number;
  runId: number;
  runAttempt: number;
  name: string;
  conclusion: string | null;
};

export type WorkflowJobListItem = {
  id: number;
  run_id?: number;
  run_attempt?: number;
  name?: string | null;
  conclusion?: string | null;
};

export function attemptJobFromApi(job: WorkflowJobListItem): AttemptJob {
  return {
    id: job.id,
    runId: job.run_id ?? 0,
    runAttempt: job.run_attempt ?? 1,
    name: job.name ?? '',
    conclusion: job.conclusion ?? null,
  };
}

/**
 * True when the jobs endpoint says this run has executions we did not fetch.
 *
 * A ci.yml run has more than 100 jobs (measured around 116–250 once every
 * attempt is included). A caller that stops after the first page has not seen
 * the later attempt, so the day cannot be treated as fully walked.
 * `totalCount === null` means the response did not say, and the caller ends
 * the walk on a short page instead.
 */
export function jobListTruncated(
  fetched: number,
  totalCount: number | null,
): boolean {
  if (totalCount === null) {
    return false;
  }
  return fetched < totalCount;
}

/**
 * Failed Unit tests jobs whose same name later succeeded, on one SHA.
 *
 * Order is run id, then attempt, then job id. A pass on a later attempt of
 * the same run and a pass on a later ci.yml run of the same commit are both
 * the signal. A pass of a different shard is not.
 */
export function confirmedFailThenPassJobs(
  jobs: AttemptJob[],
): ConfirmedFailThenPassJob[] {
  const byName = new Map<string, AttemptJob[]>();
  for (const job of jobs) {
    if (!job.name.startsWith(UNIT_TEST_JOB_PREFIX)) {
      continue;
    }
    const named = byName.get(job.name) ?? [];
    named.push(job);
    byName.set(job.name, named);
  }

  const confirmed: ConfirmedFailThenPassJob[] = [];
  const seenJobs = new Set<number>();
  for (const named of byName.values()) {
    const ordered = [...named].sort(
      (a, b) => a.runId - b.runId || a.runAttempt - b.runAttempt || a.id - b.id,
    );
    for (let index = 0; index < ordered.length; index += 1) {
      const failed = ordered[index];
      if (failed.conclusion !== 'failure') {
        continue;
      }
      const laterPass = ordered
        .slice(index + 1)
        .some((later) => later.conclusion === 'success');
      if (!laterPass || seenJobs.has(failed.id)) {
        continue;
      }
      seenJobs.add(failed.id);
      confirmed.push({
        name: failed.name,
        jobId: failed.id,
        runId: failed.runId,
      });
    }
  }
  return confirmed;
}

export type JobStep = {
  conclusion?: string | null;
  status?: string | null;
};

export type LoglessJobClassification = 'infrastructure' | 'missing_log';

/**
 * Tells a lost runner apart from a lost log for a job that failed with no
 * readable log.
 *
 * A runner that dies mid-step leaves the step `in_progress` forever and
 * uploads nothing: no test ever failed, so counting it as a fail-then-pass
 * invents a flake. A job whose steps all completed with a failure really did
 * fail — its log is simply gone, which is a hole in the history worth saying
 * out loud.
 */
export function classifyLoglessJob(job: {
  steps?: JobStep[] | null;
}): LoglessJobClassification {
  const steps = job.steps ?? [];
  if (steps.length === 0) {
    return 'infrastructure';
  }
  if (steps.some((step) => step.status !== 'completed')) {
    return 'infrastructure';
  }
  if (!steps.some((step) => step.conclusion === 'failure')) {
    return 'infrastructure';
  }
  return 'missing_log';
}

/** How many job-list requests may fail before the walk gives up on the rest. */
export const MAX_FAILED_JOB_LISTS = 3;

export type BatchFailureAction = 'stop' | 'skip';

/**
 * What a failed jobs request means for the rest of the walk.
 *
 * A rate limit applies to every later request too, so the walk stops. A
 * transient server error (GitHub returns plain 502s under load) only lost
 * that run; continuing still inspects the remaining candidates, which is the
 * difference between a partial history and none at all. A run that keeps
 * failing is an outage rather than a blip, so it stops after a few.
 */
export function classifyBatchFailure({
  status,
  failedBatches,
}: {
  status: number | null | undefined;
  failedBatches: number;
}): BatchFailureAction {
  if (status === 403 || status === 429) {
    return 'stop';
  }
  return failedBatches >= MAX_FAILED_JOB_LISTS ? 'stop' : 'skip';
}

export function parseJestFailPaths(logText: string): string[] {
  const matches = logText.matchAll(
    /FAIL\s+(\S+\.(?:test|spec)\.(?:tsx|ts|js))(?=\s|$)/gm,
  );
  return [...matches].map((match) => match[1]);
}

/**
 * Every unit test the confirmed jobs reported failing, for the nightly index.
 *
 * The per-PR walk narrows to the files one PR touched. The index has no PR to
 * narrow to, so it keeps whatever the shards actually failed on, filtered only
 * to paths the detector would ever look up again.
 */
export function allHitsFromConfirmedLogs(
  jobs: ConfirmedFailThenPassJob[],
  failPathsByJobId: Map<number, string[]>,
): SameShaLogHit[] {
  const hits: SameShaLogHit[] = [];
  for (const job of jobs) {
    const failPaths = failPathsByJobId.get(job.jobId) ?? [];
    for (const path of new Set(failPaths)) {
      if (!isFlakyWorkflowUnitTestPath(path)) {
        continue;
      }
      hits.push({ path, failRunId: job.runId, jobId: job.jobId });
    }
  }
  return hits;
}

export function shouldPostAllClear(
  hasFindings: boolean,
  historyComplete: boolean,
): boolean {
  return !hasFindings && historyComplete;
}

/**
 * States what the history index actually covers, so "nothing found" can be
 * read against the range it is true of.
 *
 * The index is built nightly on main, so its two failure modes are staleness
 * (a night did not run) and gaps (a day was walked but could not be finished).
 * Both are stated rather than hidden, because a reader who sees no findings
 * has no other way to tell a clean history from an unbuilt one.
 */
export function renderCoverageWindowLine({
  coverage,
  runsScanned,
  hasFindings = true,
}: {
  coverage: IndexCoverage;
  runsScanned: number;
  hasFindings?: boolean;
}): string {
  if (coverage.daysCovered === 0) {
    return '_History coverage: the flaky history index is unavailable, so past flakiness is unknown for these files._';
  }

  const scope = `${coverage.oldestDay} to ${coverage.newestDay}, ${coverage.daysCovered} day(s), ${runsScanned} ci run(s)`;
  if (coverage.complete) {
    return `_History coverage: ${scope}._`;
  }

  const stale =
    coverage.staleDays > 2
      ? ` The index was last built ${coverage.staleDays} day(s) ago.`
      : '';
  const gaps =
    coverage.gapDays.length > 0
      ? ` ${coverage.gapDays.length} day(s) inside the window were never fully walked.`
      : '';
  // "Findings above" only makes sense when the table rendered rows.
  const verdict = hasFindings
    ? 'Findings above are a lower bound; this is not an all-clear.'
    : 'Nothing was found in the covered range, but this is not an all-clear.';
  return `_History coverage incomplete: ${scope}.${stale}${gaps} ${verdict}_`;
}

/**
 * Disclosed rather than blocking. A fail-then-pass we could not attribute to a
 * file is still the one lead the reader has — the shard name and job link say
 * where to look, and the AI patterns stay the other signal. Refusing all-clear
 * over it would make green unreachable on a repo that loses a runner most days.
 */
export function renderUnattributedRerunsLine(
  reruns: UnattributedRerun[],
  serverUrl: string,
  repo: string,
  totalCount = reruns.length,
): string {
  if (totalCount <= 0) {
    return '';
  }
  const shards = reruns
    .map((rerun) => {
      const url = jobLogUrl(serverUrl, repo, rerun.runId, rerun.jobId);
      const reason =
        rerun.reason === 'missing_log' ? 'log missing' : 'log unread';
      return `[${rerun.jobName}](${url}) (${reason})`;
    })
    .join(', ');
  const more =
    totalCount > reruns.length ? ` and ${totalCount - reruns.length} more` : '';
  const count = `${totalCount} unit-test re-run(s)`;
  return `_${count} in this window passed on retry but could not be attributed to a file: ${shards}${more}. Low signal — check the flaky patterns column._`;
}

/**
 * A runner that died before uploading anything never failed a test, so it is
 * reported as infrastructure rather than counted as history or as a gap.
 */
export function renderInfrastructureFailuresLine(count: number): string {
  if (count <= 0) {
    return '';
  }
  return `_${count} unit-test job(s) in this window ended without finishing their steps (lost runner); they carry no test signal._`;
}
