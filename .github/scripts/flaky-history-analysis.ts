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
 *      a hit. historyComplete is false when a cap ends the walk early.
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
  isMissingLogBlobError,
  isRetriableGithubError,
  withRetryOnce,
} from './flaky-github-request';
import {
  aggregateHitsByFile,
  buildShaBatchQuery,
  candidateShaGroupsNewestFirst,
  chunkArray,
  collectListedRunsFromPages,
  confirmedFailThenPassJobs,
  filesToAnalyzeWithHistoryHits,
  groupRunsByHeadSha,
  historyCoverageComplete,
  hitsFromConfirmedLogs,
  jobLogUrl,
  parseJestFailPaths,
  parseShaBatchResponse,
  unansweredModifiedFiles,
  type ListedWorkflowRun,
} from './flaky-same-sha-history';
import { isFlakyWorkflowUnitTestPath } from './flaky-unit-test-path';

type Octokit = ReturnType<typeof getOctokit>;

// Prefix of the hidden state block embedded in the sticky comment body.
// Stage 1 reads this to determine which files need re-analysis. The state
// payload is base64-encoded (see flaky-sticky-comment.ts buildStateBlock), so
// the marker name says so and the base64 alphabet can never contain the `-->`
// sequence that closes the HTML comment.
const STATE_MARKER = '<!-- metamask-flaky-test-detection-metadata=';
// Marker used by Stage 3 to identify the sticky comment (must stay in sync).
const COMMENT_MARKER = '<!-- metamask-flaky-test-detection -->';

const WORKFLOW = 'ci.yml';
const JOB_NAME = 'Unit tests';
// All-branch volume is much higher than main-only sampling, so the window is
// shorter than the old 30d main walk.
const LOOKBACK_DAYS = 14;
const MAX_RUNS_LISTED = 2000;
const GRAPHQL_BATCH_SIZE = 6;
const MAX_GRAPHQL_QUERIES = 60;
const MAX_FAILED_LOG_FETCHES = 50;
const DOWNLOAD_CONCURRENCY = 8;

const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const OUTPUT_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');
const PRIOR_STATE_PATH = join(
  WORKSPACE_ROOT,
  '.ai-pr-analyzer/flaky-prior-state.json',
);

interface PerFileState {
  analyzedSha: string;
  findings: unknown[];
}

interface CommentState {
  version: number;
  windows: number[];
  files: Record<string, PerFileState>;
}

interface HistoryFile {
  path: string;
  flaky: boolean;
  sameShaFailThenPass: number;
  exampleRunUrl: string;
  runHistoryUrl: string;
}

interface HistoryResult {
  generatedAt: string;
  workflow: string;
  job: string;
  lookbackDays: number;
  sampledRunCount: number;
  candidateShaCount: number;
  candidatesInspected: number;
  historyComplete: boolean;
  graphqlQueries: number;
  unreadFailedRuns: number;
  analyzedFiles: string[];
  headSha: string;
  files: HistoryFile[];
}

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
  core.setOutput('missing_prior_sha_count', String(missingPriorShaCount));
  core.setOutput('candidates_inspected', String(candidatesInspected));
  core.setOutput('candidate_sha_count', String(candidateShaCount));
  core.setOutput('history_complete', historyComplete ? 'true' : 'false');
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

function parseStateFromComment(body: string): CommentState | null {
  const idx = body.indexOf(STATE_MARKER);
  if (idx === -1) return null;
  const after = body.slice(idx + STATE_MARKER.length).trimStart();
  const closeIdx = after.indexOf(' -->');
  if (closeIdx === -1) return null;
  const encoded = after.slice(0, closeIdx).trim();
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as CommentState;
  } catch {
    return null;
  }
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

function computeNeedsAnalysis(
  modifiedFiles: string[],
  priorState: CommentState | null,
): { files: string[]; missingPriorShaCount: number } {
  if (!priorState)
    return { files: [...modifiedFiles], missingPriorShaCount: 0 };

  const byAnalyzedSha = new Map<string, string[]>();
  const nopriorFiles: string[] = [];

  for (const file of modifiedFiles) {
    const prior = priorState.files[file];
    if (!prior?.analyzedSha) {
      nopriorFiles.push(file);
    } else {
      const list = byAnalyzedSha.get(prior.analyzedSha) ?? [];
      list.push(file);
      byAnalyzedSha.set(prior.analyzedSha, list);
    }
  }

  const changedFiles = new Set<string>(nopriorFiles);
  let missingPriorShaCount = 0;

  for (const [analyzedSha, files] of byAnalyzedSha) {
    if (!ensureCommitReachable(analyzedSha)) {
      core.info(
        `Prior analyzedSha ${analyzedSha} is not in this checkout — re-analyzing group`,
      );
      missingPriorShaCount += 1;
      files.forEach((f) => changedFiles.add(f));
      continue;
    }

    let changedInDiff: Set<string>;
    try {
      const diffOutput = sh('git', [
        'diff',
        '--name-only',
        analyzedSha,
        env.headSha || 'HEAD',
      ]);
      changedInDiff = new Set(
        diffOutput
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      );
    } catch (error) {
      core.info(
        `git diff ${analyzedSha}..HEAD failed — re-analyzing group: ${(error as Error).message}`,
      );
      files.forEach((f) => changedFiles.add(f));
      continue;
    }
    for (const file of files) {
      if (changedInDiff.has(file)) changedFiles.add(file);
    }
  }

  return {
    files: modifiedFiles.filter((f) => changedFiles.has(f)),
    missingPriorShaCount,
  };
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

async function collectCompletedRuns(
  octokit: Octokit,
): Promise<ListedWorkflowRun[]> {
  const [owner, repo] = env.repo.split('/');
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const iterator = octokit.paginate.iterator(
    octokit.rest.actions.listWorkflowRuns,
    {
      owner,
      repo,
      workflow_id: WORKFLOW,
      status: 'completed',
      created: `>=${since}`,
      per_page: 100,
    },
  );
  const { runs, pageErrorMessage } = await collectListedRunsFromPages(
    iterator,
    MAX_RUNS_LISTED,
  );
  if (pageErrorMessage) {
    core.warning(
      `listWorkflowRuns pagination stopped after ${runs.length} run(s): ${pageErrorMessage}`,
    );
  }
  return runs;
}

type ListedRunsResult =
  | { ok: true; runs: ListedWorkflowRun[] }
  | { ok: false; message: string };

async function getCompletedRunsInLookback(
  octokit: Octokit,
): Promise<ListedRunsResult> {
  try {
    return {
      ok: true,
      runs: await withRetryOnce(() => collectCompletedRuns(octokit)),
    };
  } catch (error) {
    return {
      ok: false,
      message: `listWorkflowRuns failed: ${(error as Error).message}`,
    };
  }
}

type FailedLogFetch = {
  filesByJobId: Map<number, string[]>;
  unreadCount: number;
};

async function downloadFailedUnitLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  failedUnitJobs: { id: number }[],
): Promise<FailedLogFetch> {
  const logParts = await mapWithConcurrency(
    failedUnitJobs,
    DOWNLOAD_CONCURRENCY,
    async (
      job,
    ): Promise<
      { jobId: number; ok: true; text: string } | { jobId: number; ok: false }
    > => {
      try {
        const res = await withRetryOnce(() =>
          octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
          }),
        );
        return { jobId: job.id, ok: true, text: String(res.data) };
      } catch (error) {
        const reason = isMissingLogBlobError(error)
          ? 'missing log blob'
          : isRetriableGithubError(error)
            ? 'GitHub API error after retry'
            : (error as Error).message;
        core.info(`downloadJobLogsForWorkflowRun ${job.id} failed: ${reason}`);
        return { jobId: job.id, ok: false };
      }
    },
  );

  const filesByJobId = new Map<number, string[]>();
  let unreadCount = 0;
  for (const part of logParts) {
    if (!part.ok) {
      unreadCount += 1;
      continue;
    }
    filesByJobId.set(part.jobId, parseJestFailPaths(part.text));
  }
  return { filesByJobId, unreadCount };
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

async function buildHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
  modifiedFiles: string[],
  runs: ListedWorkflowRun[],
): Promise<{
  files: HistoryFile[];
  unreadFailedRuns: number;
  candidateShaCount: number;
  candidatesInspected: number;
  historyComplete: boolean;
  graphqlQueries: number;
}> {
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
  let unreadFailedRuns = 0;
  let logFetches = 0;
  let graphqlQueries = 0;
  let candidatesInspected = 0;
  let capped = false;

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
      core.warning(
        `GraphQL SHA batch failed after retry: ${(error as Error).message}`,
      );
      capped = true;
      break;
    }
    candidatesInspected += shaResults.length;

    for (const shaResult of shaResults) {
      if (unansweredModifiedFiles(modifiedFiles, allHits).length === 0) {
        break;
      }
      const confirmed = confirmedFailThenPassJobs(shaResult);
      if (confirmed.length === 0) {
        continue;
      }

      const remainingBudget = MAX_FAILED_LOG_FETCHES - logFetches;
      if (remainingBudget <= 0) {
        capped = true;
        unreadFailedRuns += confirmed.length;
        break;
      }

      const toFetch = confirmed.slice(0, remainingBudget);
      if (toFetch.length < confirmed.length) {
        capped = true;
        unreadFailedRuns += confirmed.length - toFetch.length;
      }
      logFetches += toFetch.length;

      const logs = await downloadFailedUnitLogs(
        octokit,
        owner,
        repo,
        toFetch.map((job) => ({ id: job.jobId })),
      );
      unreadFailedRuns += logs.unreadCount;
      allHits.push(
        ...hitsFromConfirmedLogs(toFetch, logs.filesByJobId, modifiedFiles),
      );
    }

    if (capped) {
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
    candidateShaCount: candidates.length,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
  };
}

function writeHistoryFile(
  files: HistoryFile[],
  analyzedFiles: string[],
  headSha: string,
  meta: {
    sampledRunCount: number;
    candidateShaCount: number;
    candidatesInspected: number;
    historyComplete: boolean;
    graphqlQueries: number;
    unreadFailedRuns: number;
  },
): HistoryResult {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const result: HistoryResult = {
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW,
    job: JOB_NAME,
    lookbackDays: LOOKBACK_DAYS,
    sampledRunCount: meta.sampledRunCount,
    candidateShaCount: meta.candidateShaCount,
    candidatesInspected: meta.candidatesInspected,
    historyComplete: meta.historyComplete,
    graphqlQueries: meta.graphqlQueries,
    unreadFailedRuns: meta.unreadFailedRuns,
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
      sampledRunCount: 0,
      candidateShaCount: 0,
      candidatesInspected: 0,
      historyComplete: true,
      graphqlQueries: 0,
      unreadFailedRuns: 0,
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
  const { files: needsAnalysis, missingPriorShaCount } = computeNeedsAnalysis(
    modifiedFiles,
    priorState,
  );

  if (needsAnalysis.length === 0 && priorState !== null) {
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
  const {
    files,
    unreadFailedRuns,
    candidateShaCount,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
  } = await buildHistory(octokit, owner, repo, modifiedFiles, runs);
  console.log(
    `🔍 Sampled ${runs.length} completed ci.yml run(s) on any branch over the last ${LOOKBACK_DAYS}d ` +
      `(inspected ${candidatesInspected}/${candidateShaCount} candidate SHA(s) in ${graphqlQueries} GraphQL quer${graphqlQueries === 1 ? 'y' : 'ies'}; coverage ${historyComplete ? 'complete' : 'incomplete'})`,
  );

  const filesToAnalyze = filesToAnalyzeWithHistoryHits(needsAnalysis, files);
  const result = writeHistoryFile(files, filesToAnalyze, env.headSha, {
    sampledRunCount: runs.length,
    candidateShaCount,
    candidatesInspected,
    historyComplete,
    graphqlQueries,
    unreadFailedRuns,
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

main().catch((error: Error) => {
  failStage1(`Stage 1 failed: ${error.message}`, 'stage1_crash');
});
