/**
 * Stage 1 — Deterministic historical analysis (MCWP-474).
 *
 * Identifies Jest unit test files modified in the PR and looks for a same-SHA
 * unit-test fail-then-pass on any branch over LOOKBACK_DAYS of completed
 * ci.yml runs. Writes a machine-readable JSON artifact consumed by Stage 2
 * (AI analyzer) and Stage 3 (sticky PR comment).
 *
 * Funnel (IDs first, logs last):
 *   0. REST listWorkflowRuns — run id, head_sha, run_attempt, conclusion
 *   1. Candidate SHAs — re-run, or 2+ run ids with a failure AND a success
 *   2. GraphQL batch — failed Unit tests check runs + latest successes
 *   3. Confirm the same job name later succeeded on that SHA
 *   4. Download logs only for those jobs; stop when every modified file has
 *      a hit. historyComplete is false when a cap ends the walk early or a
 *      log a re-run could still read was not read. Logs GitHub reports as
 *      missing (404) are counted apart in missingLogBlobs and disclosed in
 *      the comment; they never block all-clear because they never come back.
 *
 * Logging rule:
 *   - core.info — expected no-op (no modified tests, unchanged since last
 *     analysis, missing log blob, unreachable prior SHA).
 *   - core.warning — degraded but still correct (partial listWorkflowRuns pages).
 *   - core.setFailed — stage cannot do its job (git diff / token / API after
 *     retry / uncaught exception). Outputs are still written for the Summary;
 *     has_test_files stays unset so Stage 3 never posts a false all-clear.
 * The workflow is not a required check; continue-on-error + a final gate make
 * real failures visible without blocking the PR.
 *
 * Why same SHA only: a later commit can change production code, Jest setup, or
 * another test and make a previously failing unit test pass. That is
 * indistinguishable from a real fix. An identical head SHA cannot be a code
 * fix, so FAIL then PASS on that SHA (GitHub Re-run jobs, or a second ci.yml
 * run on the same commit) is the history signal.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  githubErrorStatus,
  isMissingLogBlobError,
  isRetriableGithubError,
  withRetryOnce,
} from './flaky-github-request';
import {
  aggregateHitsByFile,
  buildShaBatchQuery,
  candidateShaGroupsNewestFirst,
  chunkArray,
  classifyBatchFailure,
  classifyLoglessJob,
  collectListedRunsFromPages,
  confirmedFailThenPassJobs,
  groupRunsByHeadSha,
  historyCoverageComplete,
  hitsFromConfirmedLogs,
  jobLogUrl,
  lookbackDayBuckets,
  parseJestFailPaths,
  parseShaBatchResponse,
  summarizeCoverageWindow,
  unansweredModifiedFiles,
  type ConfirmedFailThenPassJob,
  type CoverageWindow,
  type ListedWorkflowRun,
  type UnattributedRerun,
} from './flaky-same-sha-history';
import { isFlakyWorkflowUnitTestPath } from './flaky-unit-test-path';
import {
  commentFileSetChanged,
  computeNeedsAnalysis,
} from './flaky-needs-analysis';
import { COMMENT_MARKER, parseStateFromComment } from './flaky-comment-state';
import type { CommentState, HistoryArtifact, HistoryFile } from './flaky-types';

type Octokit = ReturnType<typeof getOctokit>;

const WORKFLOW = 'ci.yml';
const JOB_NAME = 'Unit tests';
// All-branch volume is much higher than main-only sampling, so the window is
// shorter than the old 30d main walk.
const LOOKBACK_DAYS = 14;
// listWorkflowRuns serves at most 1000 results per query; one query per day
// keeps each bucket clear of that ceiling at this repo's run volume.
const MAX_RUNS_PER_DAY = 1000;
const MAX_RUNS_LISTED = 8000;
// Measured against the live API: a 20-SHA batch costs 20 GraphQL points and
// 151k nodes (the per-query node limit is 500k), so points scale with commits
// inspected, not with queries. GITHUB_TOKEN gets 1000 points per hour per
// repository, and this workflow can run several times an hour, so the walk
// stops at 500 commits and leaves half the budget to everything else.
const GRAPHQL_BATCH_SIZE = 20;
const MAX_GRAPHQL_QUERIES = 25;
export const MAX_GRAPHQL_POINTS_PER_RUN =
  GRAPHQL_BATCH_SIZE * MAX_GRAPHQL_QUERIES;
const MAX_FAILED_LOG_FETCHES = 50;
const DOWNLOAD_CONCURRENCY = 8;
// The comment names a few shards rather than every one of them.
const MAX_DISCLOSED_RERUNS = 5;

const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const OUTPUT_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');
const PRIOR_STATE_PATH = join(
  WORKSPACE_ROOT,
  '.ai-pr-analyzer/flaky-prior-state.json',
);

const env = {
  baseRef: process.env.BASE_REF ?? 'main',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '',
  prNumber: Number(process.env.PR_NUMBER ?? '0'),
  headSha: process.env.HEAD_SHA ?? '',
};

function workflowRunsUrl(): string {
  return `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}`;
}

function exampleJobLogUrl(runId: number, jobId: number): string {
  return jobLogUrl(env.serverUrl, env.repo, runId, jobId);
}

function emptyHistoryFile(path: string): HistoryFile {
  return {
    path,
    flaky: false,
    sameShaFailThenPass: 0,
    exampleRunUrl: '',
    runHistoryUrl: workflowRunsUrl(),
  };
}

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
}

function commitExists(sha: string): boolean {
  try {
    sh('git', ['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function ensureCommitReachable(sha: string): boolean {
  if (commitExists(sha)) {
    return true;
  }
  try {
    sh('git', ['fetch', '--no-tags', 'origin', sha]);
  } catch {
    return false;
  }
  return commitExists(sha);
}

type Stage1SkipReason =
  | 'no_modified_unit_tests'
  | 'unchanged_since_last_analysis'
  | 'stage1_crash'
  | 'git_diff_failed'
  | 'missing_token'
  | 'prior_state_fetch_failed'
  | 'list_runs_failed'
  | '';

function setStage1Outputs({
  hasTestFiles,
  shouldAnalyze,
  filesToAnalyze,
  skipReason,
  modifiedFileCount,
  historicallyFlakyCount,
  unreadFailedRuns,
  missingLogBlobs,
  infrastructureFailures = 0,
  unattributedReruns = 0,
  coverageWindow = EMPTY_COVERAGE_WINDOW,
  missingPriorShaCount,
  candidatesInspected,
  candidateShaCount,
  historyComplete,
}: {
  hasTestFiles: boolean;
  shouldAnalyze: boolean;
  filesToAnalyze: string[];
  skipReason: Stage1SkipReason;
  modifiedFileCount: number;
  historicallyFlakyCount: number;
  unreadFailedRuns: number;
  missingLogBlobs: number;
  infrastructureFailures?: number;
  unattributedReruns?: number;
  coverageWindow?: CoverageWindow;
  missingPriorShaCount: number;
  candidatesInspected: number;
  candidateShaCount: number;
  historyComplete: boolean;
}): void {
  core.setOutput('has_test_files', hasTestFiles ? 'true' : 'false');
  core.setOutput('should_analyze', shouldAnalyze ? 'true' : 'false');
  core.setOutput('files_to_analyze', filesToAnalyze.join(' '));
  core.setOutput('skip_reason', skipReason);
  core.setOutput('modified_file_count', String(modifiedFileCount));
  core.setOutput('files_to_analyze_count', String(filesToAnalyze.length));
  core.setOutput('historically_flaky_count', String(historicallyFlakyCount));
  core.setOutput('unread_failed_runs', String(unreadFailedRuns));
  core.setOutput('missing_log_blobs', String(missingLogBlobs));
  core.setOutput('infrastructure_failures', String(infrastructureFailures));
  core.setOutput('unattributed_reruns', String(unattributedReruns));
  core.setOutput('missing_prior_sha_count', String(missingPriorShaCount));
  core.setOutput('candidates_inspected', String(candidatesInspected));
  core.setOutput('candidate_sha_count', String(candidateShaCount));
  core.setOutput('history_complete', historyComplete ? 'true' : 'false');
  core.setOutput('history_window', describeCoverageWindow(coverageWindow));
}

/** One cell for the Summary table: the range the walk actually covered. */
export function describeCoverageWindow(window: CoverageWindow): string {
  if (!window.oldestRunSampled || !window.newestRunSampled) {
    return `last ${window.lookbackDays}d, 0 runs`;
  }
  const capped =
    window.cappedDays.length > 0
      ? `, ${window.cappedDays.length} day(s) clipped`
      : '';
  return `${window.oldestRunSampled} → ${window.newestRunSampled}, ${window.runsListed} runs${capped}`;
}

// setFailed + Summary outputs; deliberately omit has_test_files so Stage 3
// never takes the "no unit tests → all-clear" path after a Stage 1 failure.
function failStage1(
  message: string,
  skipReason: Stage1SkipReason,
  counts?: {
    modifiedFileCount?: number;
    unreadFailedRuns?: number;
    missingPriorShaCount?: number;
  },
): void {
  core.setFailed(message);
  core.setOutput('should_analyze', 'false');
  core.setOutput('files_to_analyze', '');
  core.setOutput('skip_reason', skipReason);
  core.setOutput('files_to_analyze_count', '0');
  core.setOutput('historically_flaky_count', '0');
  core.setOutput('modified_file_count', String(counts?.modifiedFileCount ?? 0));
  core.setOutput('unread_failed_runs', String(counts?.unreadFailedRuns ?? 0));
  core.setOutput('missing_log_blobs', '0');
  core.setOutput('infrastructure_failures', '0');
  core.setOutput('unattributed_reruns', '0');
  core.setOutput(
    'history_window',
    describeCoverageWindow(EMPTY_COVERAGE_WINDOW),
  );
  core.setOutput(
    'missing_prior_sha_count',
    String(counts?.missingPriorShaCount ?? 0),
  );
  core.setOutput('candidates_inspected', '0');
  core.setOutput('candidate_sha_count', '0');
  core.setOutput('history_complete', 'false');
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

type PriorStateResult =
  | { ok: true; state: CommentState | null }
  | { ok: false; message: string };

async function fetchPriorState(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<PriorStateResult> {
  if (!env.prNumber) return { ok: true, state: null };
  try {
    const comments = await withRetryOnce(() =>
      octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number: env.prNumber,
        per_page: 100,
      }),
    );
    const sticky = comments.find((c) => c.body?.startsWith(COMMENT_MARKER));
    if (!sticky?.body) return { ok: true, state: null };
    return { ok: true, state: parseStateFromComment(sticky.body) };
  } catch (error) {
    return {
      ok: false,
      message: `fetchPriorState failed: ${(error as Error).message}`,
    };
  }
}

function computeNeedsAnalysisWithGit(
  modifiedFiles: string[],
  priorState: CommentState | null,
): { files: string[]; missingPriorShaCount: number } {
  return computeNeedsAnalysis(modifiedFiles, priorState, {
    headSha: env.headSha || 'HEAD',
    isCommitReachable: (sha) => {
      const reachable = ensureCommitReachable(sha);
      if (!reachable) {
        core.info(
          `Prior analyzedSha ${sha} is not in this checkout — re-analyzing group`,
        );
      }
      return reachable;
    },
    diffNameOnly: (fromSha, toSha) => {
      try {
        return sh('git', ['diff', '--name-only', fromSha, toSha])
          .split('\n')
          .map((file) => file.trim())
          .filter(Boolean);
      } catch (error) {
        core.info(
          `git diff ${fromSha}..HEAD failed — re-analyzing group: ${(error as Error).message}`,
        );
        throw error;
      }
    },
  });
}

type ModifiedFilesResult =
  | { ok: true; files: string[] }
  | { ok: false; message: string };

function getModifiedUnitTestFiles(): ModifiedFilesResult {
  let diffOutput: string;
  try {
    diffOutput = sh('git', [
      'diff',
      '--name-only',
      // A deleted test file cannot be reviewed or linked to, and history for a
      // path the PR removed is not something the author can act on.
      '--diff-filter=d',
      `origin/${env.baseRef}...${env.headSha || 'HEAD'}`,
    ]);
  } catch (error) {
    return {
      ok: false,
      message: `git diff failed: ${(error as Error).message}`,
    };
  }

  return {
    ok: true,
    files: diffOutput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
      .filter((f) => isFlakyWorkflowUnitTestPath(f)),
  };
}

async function collectRunsForDay(
  octokit: Octokit,
  day: string,
): Promise<{ runs: ListedWorkflowRun[]; capped: boolean }> {
  const [owner, repo] = env.repo.split('/');
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

type ListedRunsResult =
  | { ok: true; runs: ListedWorkflowRun[]; cappedDays: string[] }
  | { ok: false; message: string };

/**
 * One query per day: a single `created: >=<date>` query is served from the
 * same 1000-result ceiling as any other listing, so at this repo's volume it
 * silently returns only the newest days of the requested window.
 */
async function getCompletedRunsInLookback(
  octokit: Octokit,
): Promise<ListedRunsResult> {
  const runs: ListedWorkflowRun[] = [];
  const cappedDays: string[] = [];
  for (const day of lookbackDayBuckets(new Date(), LOOKBACK_DAYS)) {
    if (runs.length >= MAX_RUNS_LISTED) {
      core.warning(
        `listWorkflowRuns stopped at ${MAX_RUNS_LISTED} run(s); window shortened before ${day}`,
      );
      break;
    }
    let listed: { runs: ListedWorkflowRun[]; capped: boolean };
    try {
      listed = await withRetryOnce(() => collectRunsForDay(octokit, day));
    } catch (error) {
      // Days already listed are still a usable window; failing the stage would
      // throw away a walk that only lost its oldest end.
      if (runs.length === 0) {
        return {
          ok: false,
          message: `listWorkflowRuns failed: ${(error as Error).message}`,
        };
      }
      core.warning(
        `listWorkflowRuns ${day} failed: ${(error as Error).message}`,
      );
      cappedDays.push(day);
      break;
    }
    if (listed.capped) {
      core.warning(
        `listWorkflowRuns ${day} hit the ${MAX_RUNS_PER_DAY}-result ceiling; older runs that day were not listed`,
      );
      cappedDays.push(day);
    }
    runs.push(...listed.runs);
  }
  return { ok: true, runs, cappedDays };
}

// A 404 means GitHub no longer has the blob. Which kind of gap that is depends
// on the job itself: a runner that died mid-step never had a log to lose and
// never failed a test, while a job whose steps all completed really did fail.
type LogFetchFailure = 'missing_blob' | 'infrastructure' | 'unread';

type FailedLogFetch = {
  filesByJobId: Map<number, string[]>;
  unreadCount: number;
  missingBlobCount: number;
  infrastructureCount: number;
  unattributed: UnattributedRerun[];
};

/**
 * GitHub serves the log from Azure behind a redirect, so a 404 alone does not
 * say whether a test failed. The job record does: its steps are still there
 * after the log is gone.
 */
async function classifyMissingLog(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
): Promise<'infrastructure' | 'missing_blob'> {
  try {
    const { data } = await withRetryOnce(() =>
      octokit.rest.actions.getJobForWorkflowRun({
        owner,
        repo,
        job_id: jobId,
      }),
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

type BuildHistoryResult = {
  files: HistoryFile[];
  unreadFailedRuns: number;
  missingLogBlobs: number;
  infrastructureFailures: number;
  unattributedReruns: UnattributedRerun[];
  candidateShaCount: number;
  candidatesInspected: number;
  historyComplete: boolean;
  graphqlQueries: number;
};

async function buildHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
  modifiedFiles: string[],
  runs: ListedWorkflowRun[],
): Promise<BuildHistoryResult> {
  const groups = groupRunsByHeadSha(runs);
  const candidates = candidateShaGroupsNewestFirst(groups);
  const batches = chunkArray(
    candidates.map((candidate) => candidate.headSha),
    GRAPHQL_BATCH_SIZE,
  );

  const allHits: {
    path: string;
    failRunId: number;
    jobId: number;
  }[] = [];
  const unattributedReruns: UnattributedRerun[] = [];
  let unreadFailedRuns = 0;
  let missingLogBlobs = 0;
  let infrastructureFailures = 0;
  let logFetches = 0;
  let graphqlQueries = 0;
  let candidatesInspected = 0;
  let failedBatches = 0;
  // `capped` means the history has a hole; `stopWalk` means there is no point
  // asking for more. A skipped batch is the first without the second.
  let capped = false;
  let stopWalk = false;

  for (const batch of batches) {
    if (graphqlQueries >= MAX_GRAPHQL_QUERIES) {
      capped = true;
      break;
    }
    if (unansweredModifiedFiles(modifiedFiles, allHits).length === 0) {
      break;
    }

    graphqlQueries += 1;
    let shaResults: ReturnType<typeof parseShaBatchResponse>;
    try {
      shaResults = await fetchShaBatch(octokit, owner, repo, batch);
    } catch (error) {
      failedBatches += 1;
      const status = githubErrorStatus(error);
      const action = classifyBatchFailure({ status, failedBatches });
      core.warning(
        `GraphQL SHA batch ${status === 403 || status === 429 ? 'hit the API rate limit' : 'failed after retry'}, ${action === 'stop' ? 'stopping the walk' : 'skipping these SHAs'}: ${(error as Error).message}`,
      );
      capped = true;
      if (action === 'stop') {
        stopWalk = true;
        break;
      }
      continue;
    }
    candidatesInspected += shaResults.length;

    for (const shaResult of shaResults) {
      if (unansweredModifiedFiles(modifiedFiles, allHits).length === 0) {
        break;
      }
      // A commit whose check-run pages were clipped may hide a confirmation,
      // so it is a gap in the walk rather than an inspected commit.
      if (shaResult.truncated) {
        core.warning(
          `Check runs for ${shaResult.headSha} were truncated; coverage is incomplete`,
        );
        capped = true;
      }
      const confirmed = confirmedFailThenPassJobs(shaResult);
      if (confirmed.length === 0) {
        continue;
      }

      const remainingBudget = MAX_FAILED_LOG_FETCHES - logFetches;
      if (remainingBudget <= 0) {
        capped = true;
        stopWalk = true;
        unreadFailedRuns += confirmed.length;
        break;
      }

      const toFetch = confirmed.slice(0, remainingBudget);
      if (toFetch.length < confirmed.length) {
        capped = true;
        stopWalk = true;
        unreadFailedRuns += confirmed.length - toFetch.length;
      }
      logFetches += toFetch.length;

      const logs = await downloadFailedUnitLogs(octokit, owner, repo, toFetch);
      unreadFailedRuns += logs.unreadCount;
      missingLogBlobs += logs.missingBlobCount;
      infrastructureFailures += logs.infrastructureCount;
      unattributedReruns.push(...logs.unattributed);
      allHits.push(
        ...hitsFromConfirmedLogs(toFetch, logs.filesByJobId, modifiedFiles),
      );
    }

    if (stopWalk) {
      break;
    }
  }

  const walkedAllCandidates =
    !capped && candidatesInspected >= candidates.length;
  const everyFileHasHit =
    unansweredModifiedFiles(modifiedFiles, allHits).length === 0;
  const historyComplete = historyCoverageComplete({
    everyFileHasHit,
    walkedAllCandidates,
    unreadFailedRuns,
  });

  const byFile = aggregateHitsByFile(allHits, exampleJobLogUrl);
  const files = modifiedFiles.map((path) => {
    const hit = byFile.get(path);
    if (!hit) {
      return emptyHistoryFile(path);
    }
    return {
      path,
      flaky: hit.count >= 1,
      sameShaFailThenPass: hit.count,
      exampleRunUrl: hit.exampleRunUrl,
      runHistoryUrl: hit.exampleRunUrl,
    };
  });

  return {
    files,
    unreadFailedRuns,
    missingLogBlobs,
    infrastructureFailures,
    unattributedReruns,
    candidateShaCount: candidates.length,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
  };
}

const EMPTY_COVERAGE_WINDOW: CoverageWindow = {
  lookbackDays: LOOKBACK_DAYS,
  runsListed: 0,
  oldestRunSampled: '',
  newestRunSampled: '',
  cappedDays: [],
};

function writeHistoryFile(
  files: HistoryFile[],
  analyzedFiles: string[],
  headSha: string,
  meta: {
    coverageWindow: CoverageWindow;
    sampledRunCount: number;
    candidateShaCount: number;
    candidatesInspected: number;
    historyComplete: boolean;
    graphqlQueries: number;
    unreadFailedRuns: number;
    missingLogBlobs: number;
    infrastructureFailures: number;
    unattributedReruns: UnattributedRerun[];
    unattributedRerunCount: number;
  },
): HistoryArtifact {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const result: HistoryArtifact = {
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW,
    job: JOB_NAME,
    lookbackDays: LOOKBACK_DAYS,
    coverageWindow: meta.coverageWindow,
    sampledRunCount: meta.sampledRunCount,
    candidateShaCount: meta.candidateShaCount,
    candidatesInspected: meta.candidatesInspected,
    historyComplete: meta.historyComplete,
    graphqlQueries: meta.graphqlQueries,
    unreadFailedRuns: meta.unreadFailedRuns,
    missingLogBlobs: meta.missingLogBlobs,
    infrastructureFailures: meta.infrastructureFailures,
    unattributedReruns: meta.unattributedReruns,
    unattributedRerunCount: meta.unattributedRerunCount,
    analyzedFiles,
    headSha,
    files,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  return result;
}

function writePriorStateFile(state: CommentState | null): void {
  mkdirSync(dirname(PRIOR_STATE_PATH), { recursive: true });
  const empty: CommentState = {
    version: 1,
    windows: [LOOKBACK_DAYS],
    files: {},
  };
  writeFileSync(PRIOR_STATE_PATH, JSON.stringify(state ?? empty, null, 2));
}

async function main(): Promise<void> {
  const modifiedResult = getModifiedUnitTestFiles();
  if (!modifiedResult.ok) {
    failStage1(modifiedResult.message, 'git_diff_failed');
    return;
  }
  const modifiedFiles = modifiedResult.files;
  console.log(
    `📁 Found ${modifiedFiles.length} modified unit test file(s): ${modifiedFiles.join(', ') || 'none'}`,
  );

  if (modifiedFiles.length === 0) {
    writeHistoryFile([], [], env.headSha, {
      coverageWindow: EMPTY_COVERAGE_WINDOW,
      sampledRunCount: 0,
      candidateShaCount: 0,
      candidatesInspected: 0,
      historyComplete: true,
      graphqlQueries: 0,
      unreadFailedRuns: 0,
      missingLogBlobs: 0,
      infrastructureFailures: 0,
      unattributedReruns: [],
      unattributedRerunCount: 0,
    });
    writePriorStateFile(null);
    setStage1Outputs({
      hasTestFiles: false,
      shouldAnalyze: false,
      filesToAnalyze: [],
      skipReason: 'no_modified_unit_tests',
      modifiedFileCount: 0,
      historicallyFlakyCount: 0,
      unreadFailedRuns: 0,
      missingLogBlobs: 0,
      missingPriorShaCount: 0,
      candidatesInspected: 0,
      candidateShaCount: 0,
      historyComplete: true,
    });
    console.log('💡 No modified unit test files — skipping history sampling');
    return;
  }

  if (!env.token) {
    failStage1('No GitHub token — cannot sample history', 'missing_token', {
      modifiedFileCount: modifiedFiles.length,
    });
    return;
  }

  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token);

  const priorResult = await fetchPriorState(octokit, owner, repo);
  if (!priorResult.ok) {
    failStage1(priorResult.message, 'prior_state_fetch_failed', {
      modifiedFileCount: modifiedFiles.length,
    });
    return;
  }
  const priorState = priorResult.state;
  const { files: needsAnalysis, missingPriorShaCount } =
    computeNeedsAnalysisWithGit(modifiedFiles, priorState);

  // A shrinking or growing file set still needs a fresh comment even when no
  // single file needs a new review, so Stage 3 can drop sections for files the
  // PR no longer touches.
  const staleFileSet = commentFileSetChanged(modifiedFiles, priorState);

  if (needsAnalysis.length === 0 && priorState !== null && !staleFileSet) {
    console.log(
      '⏭️  No modified test files changed since last analysis — skipping',
    );
    setStage1Outputs({
      hasTestFiles: true,
      shouldAnalyze: false,
      filesToAnalyze: [],
      skipReason: 'unchanged_since_last_analysis',
      modifiedFileCount: modifiedFiles.length,
      historicallyFlakyCount: 0,
      unreadFailedRuns: 0,
      missingLogBlobs: 0,
      missingPriorShaCount,
      candidatesInspected: 0,
      candidateShaCount: 0,
      historyComplete: true,
    });
    return;
  }

  writePriorStateFile(priorState);

  const runsResult = await getCompletedRunsInLookback(octokit);
  if (!runsResult.ok) {
    failStage1(runsResult.message, 'list_runs_failed', {
      modifiedFileCount: modifiedFiles.length,
      missingPriorShaCount,
    });
    return;
  }
  const runs = runsResult.runs;
  const coverageWindow = summarizeCoverageWindow({
    runs,
    lookbackDays: LOOKBACK_DAYS,
    cappedDays: runsResult.cappedDays,
  });
  const {
    files,
    unreadFailedRuns,
    missingLogBlobs,
    infrastructureFailures,
    unattributedReruns,
    candidateShaCount,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
  } = await buildHistory(octokit, owner, repo, modifiedFiles, runs);
  console.log(
    `🔍 Sampled ${describeCoverageWindow(coverageWindow)} ` +
      `(inspected ${candidatesInspected}/${candidateShaCount} candidate SHA(s) in ${graphqlQueries} GraphQL quer${graphqlQueries === 1 ? 'y' : 'ies'}; coverage ${historyComplete ? 'complete' : 'incomplete'}; ` +
      `${unreadFailedRuns} unread, ${missingLogBlobs} missing log(s), ${infrastructureFailures} lost runner(s))`,
  );

  // Stage 2 only re-runs files that still need a review. Historically flaky
  // files that already have patternsReviewed stay out so they cannot fill the
  // per-run cap and starve files waiting for retry.
  const filesToAnalyze = needsAnalysis;
  const result = writeHistoryFile(files, filesToAnalyze, env.headSha, {
    coverageWindow,
    sampledRunCount: runs.length,
    candidateShaCount,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
    unreadFailedRuns,
    missingLogBlobs,
    infrastructureFailures,
    unattributedReruns: unattributedReruns.slice(0, MAX_DISCLOSED_RERUNS),
    unattributedRerunCount: unattributedReruns.length,
  });

  const flakyCount = files.filter((f) => f.flaky).length;
  setStage1Outputs({
    hasTestFiles: true,
    shouldAnalyze: true,
    filesToAnalyze,
    skipReason: '',
    modifiedFileCount: modifiedFiles.length,
    historicallyFlakyCount: flakyCount,
    unreadFailedRuns,
    missingLogBlobs,
    infrastructureFailures,
    unattributedReruns: unattributedReruns.length,
    coverageWindow,
    missingPriorShaCount,
    candidatesInspected,
    candidateShaCount,
    historyComplete,
  });
  console.log(
    `✅ Wrote ${OUTPUT_PATH} — ${flakyCount} of ${files.length} modified test file(s) flagged as historically flaky`,
  );
  console.log(JSON.stringify(result, null, 2));
}

// Guarded so tests can import the pure helpers above without running the walk.
if (require.main === module) {
  main().catch((error: Error) => {
    failStage1(`Stage 1 failed: ${error.message}`, 'stage1_crash');
  });
}
