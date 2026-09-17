/**
 * Stage 1 — Deterministic historical analysis (MCWP-474).
 *
 * Identifies Jest unit test files modified in the PR and looks for a same-SHA
 * unit-test fail-then-pass on any branch over LOOKBACK_DAYS of completed
 * ci.yml runs. Writes a machine-readable JSON artifact consumed by Stage 2
 * (AI analyzer) and Stage 3 (sticky PR comment).
 *
 * Historical fail-then-pass is a HINT, not proof — a file can be flagged here
 * with zero AI findings, or have AI findings with no historical signal.
 *
 * Failure modes are always downgraded to warnings + empty results so the
 * workflow stays informational and never blocks a PR.
 *
 * Why same SHA only: a later commit can change production code, Jest setup, or
 * another test and make a previously failing unit test pass. That is
 * indistinguishable from a real fix. An identical head SHA cannot be a code
 * fix, so FAIL then PASS on that SHA (GitHub Re-run jobs, or a second ci.yml
 * run on the same commit) is the history signal.
 *
 * Design note — why we rely on history + AI patterns only, and deliberately do
 * NOT execute the PR's changed tests or inspect the PR's own ci.yml unit-test
 * run to decide flakiness:
 *
 *   - New test with a flaky pattern: a single PR unit-test run almost never
 *     reproduces the flake, so a run-based signal would usually miss it. AI
 *     pattern detection on the diff is what actually catches this case.
 *   - Existing test changed by the PR: AI detects the pattern AND same-SHA
 *     fail-then-pass on any branch provides an independent signal, so both fire.
 *   - A modified test with an AI-detected pattern but zero historical hits
 *     is still worth flagging: passing so far may just be luck or ordering, and
 *     it can start failing under a different test order or in edge cases.
 *
 * Flagging on pattern rather than on an observed failure is intentional — the
 * output is informational and exists to prompt the author to review, not to
 * assert the test has already failed. Running or waiting on the PR's tests
 * would add cost and latency without meaningfully improving these outcomes.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  isMissingLogBlobError,
  isRetriableGithubError,
  unitTestLogsReadable,
  withRetryOnce,
} from './flaky-github-request';
import {
  allUnitTestJobsSucceeded,
  aggregateHitsByFile,
  candidateShaGroupsNewestFirst,
  collectSameShaHitsForGroup,
  failedUnitTestJobs,
  groupRunsByHeadSha,
  parseJestFailPaths,
  snapshotInspectOrder,
  snapshotsToInspect,
  type InspectedSnapshot,
  type ListedWorkflowRun,
  type RunAttemptSnapshot,
  type WorkflowJob,
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
const MAX_JOB_LIST_CALLS = 200;
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
  jobListCalls: number;
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

function runUrl(runId: number): string {
  return `${env.serverUrl}/${env.repo}/actions/runs/${runId}`;
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
}: {
  hasTestFiles: boolean;
  shouldAnalyze: boolean;
  filesToAnalyze: string[];
  skipReason: Stage1SkipReason;
  modifiedFileCount: number;
  historicallyFlakyCount: number;
  unreadFailedRuns: number;
  missingPriorShaCount: number;
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

async function fetchPriorState(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<CommentState | null> {
  if (!env.prNumber) return null;
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
    if (!sticky?.body) return null;
    return parseStateFromComment(sticky.body);
  } catch (error) {
    core.warning(`fetchPriorState failed: ${(error as Error).message}`);
    return null;
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

function getModifiedUnitTestFiles(): string[] {
  let diffOutput: string;
  try {
    diffOutput = sh('git', [
      'diff',
      '--name-only',
      `origin/${env.baseRef}...${env.headSha || 'HEAD'}`,
    ]);
  } catch (error) {
    core.warning(`git diff failed: ${(error as Error).message}`);
    return [];
  }

  return diffOutput
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => isFlakyWorkflowUnitTestPath(f));
}

async function collectCompletedRuns(
  octokit: Octokit,
): Promise<ListedWorkflowRun[]> {
  const [owner, repo] = env.repo.split('/');
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const runs: ListedWorkflowRun[] = [];
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
  for await (const { data } of iterator) {
    for (const r of data) {
      runs.push({
        id: r.id,
        conclusion: r.conclusion,
        createdAt: r.created_at,
        headSha: r.head_sha,
        runAttempt: r.run_attempt,
      });
      if (runs.length >= MAX_RUNS_LISTED) return runs;
    }
  }
  return runs;
}

async function getCompletedRunsInLookback(
  octokit: Octokit,
): Promise<ListedWorkflowRun[]> {
  try {
    return await withRetryOnce(() => collectCompletedRuns(octokit));
  } catch (error) {
    core.warning(`listWorkflowRuns failed: ${(error as Error).message}`);
    return [];
  }
}

type JobListResult = { ok: true; jobs: WorkflowJob[] } | { ok: false };

async function listJobsForSnapshot(
  octokit: Octokit,
  owner: string,
  repo: string,
  snapshot: RunAttemptSnapshot,
): Promise<JobListResult> {
  try {
    const jobs = await withRetryOnce(() =>
      octokit.paginate(octokit.rest.actions.listJobsForWorkflowRunAttempt, {
        owner,
        repo,
        run_id: snapshot.runId,
        attempt_number: snapshot.attempt,
        per_page: 100,
      }),
    );
    return {
      ok: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        conclusion: job.conclusion,
      })),
    };
  } catch (error) {
    core.info(
      `listJobsForWorkflowRunAttempt ${snapshot.runId} attempt ${snapshot.attempt} failed: ${(error as Error).message}`,
    );
    return { ok: false };
  }
}

type FailedLogFetch = {
  files: string[];
  logsReadable: boolean;
};

async function downloadFailedUnitLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  failedUnitJobs: WorkflowJob[],
): Promise<FailedLogFetch> {
  const logParts = await mapWithConcurrency(
    failedUnitJobs,
    DOWNLOAD_CONCURRENCY,
    async (job): Promise<{ ok: true; text: string } | { ok: false }> => {
      try {
        const res = await withRetryOnce(() =>
          octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
          }),
        );
        return { ok: true, text: String(res.data) };
      } catch (error) {
        const reason = isMissingLogBlobError(error)
          ? 'missing log blob'
          : isRetriableGithubError(error)
            ? 'GitHub API error after retry'
            : (error as Error).message;
        core.info(`downloadJobLogsForWorkflowRun ${job.id} failed: ${reason}`);
        return { ok: false };
      }
    },
  );

  const downloadedOkCount = logParts.filter((part) => part.ok).length;
  const logsReadable = unitTestLogsReadable({
    listJobsFailed: false,
    failedUnitJobCount: failedUnitJobs.length,
    downloadedOkCount,
  });
  if (!logsReadable) {
    return { files: [], logsReadable: false };
  }

  const logOutput = logParts
    .filter((part): part is { ok: true; text: string } => part.ok)
    .map((part) => part.text)
    .join('\n');
  return { files: parseJestFailPaths(logOutput), logsReadable: true };
}

async function inspectSnapshot(
  octokit: Octokit,
  owner: string,
  repo: string,
  snapshot: RunAttemptSnapshot,
  budget: { jobListCalls: number; logFetches: number },
): Promise<{
  inspected: InspectedSnapshot | null;
  unreadFailed: boolean;
}> {
  if (budget.jobListCalls >= MAX_JOB_LIST_CALLS) {
    return { inspected: null, unreadFailed: false };
  }
  budget.jobListCalls += 1;
  const listed = await listJobsForSnapshot(octokit, owner, repo, snapshot);
  if (!listed.ok) {
    return { inspected: null, unreadFailed: false };
  }

  const failedUnit = failedUnitTestJobs(listed.jobs);
  if (failedUnit.length > 0) {
    if (budget.logFetches >= MAX_FAILED_LOG_FETCHES) {
      return { inspected: null, unreadFailed: true };
    }
    budget.logFetches += 1;
    const logs = await downloadFailedUnitLogs(octokit, owner, repo, failedUnit);
    if (!logs.logsReadable) {
      return { inspected: null, unreadFailed: true };
    }
    return {
      inspected: {
        ...snapshot,
        unitFailPaths: logs.files,
        unitAllPassed: false,
      },
      unreadFailed: false,
    };
  }

  return {
    inspected: {
      ...snapshot,
      unitFailPaths: [],
      unitAllPassed: allUnitTestJobsSucceeded(listed.jobs),
    },
    unreadFailed: false,
  };
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
  jobListCalls: number;
}> {
  const groups = groupRunsByHeadSha(runs);
  const candidates = candidateShaGroupsNewestFirst(groups);
  const budget = { jobListCalls: 0, logFetches: 0 };
  let unreadFailedRuns = 0;
  const allHits: { path: string; failRunId: number }[] = [];

  for (const { runs: runsForSha } of candidates) {
    if (budget.jobListCalls >= MAX_JOB_LIST_CALLS) {
      break;
    }
    const ordered = snapshotInspectOrder(
      snapshotsToInspect(runsForSha),
      runsForSha,
    );
    const inspected: InspectedSnapshot[] = [];
    for (const snapshot of ordered) {
      const result = await inspectSnapshot(
        octokit,
        owner,
        repo,
        snapshot,
        budget,
      );
      if (result.unreadFailed) {
        unreadFailedRuns += 1;
      }
      if (result.inspected) {
        inspected.push(result.inspected);
      }
    }
    allHits.push(...collectSameShaHitsForGroup(inspected, modifiedFiles));
  }

  const byFile = aggregateHitsByFile(allHits, runUrl);

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
    jobListCalls: budget.jobListCalls,
  };
}

function writeHistoryFile(
  files: HistoryFile[],
  analyzedFiles: string[],
  headSha: string,
  meta: {
    sampledRunCount: number;
    candidateShaCount: number;
    jobListCalls: number;
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
    jobListCalls: meta.jobListCalls,
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
  const modifiedFiles = getModifiedUnitTestFiles();
  console.log(
    `📁 Found ${modifiedFiles.length} modified unit test file(s): ${modifiedFiles.join(', ') || 'none'}`,
  );

  if (modifiedFiles.length === 0) {
    writeHistoryFile([], [], env.headSha, {
      sampledRunCount: 0,
      candidateShaCount: 0,
      jobListCalls: 0,
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
    });
    console.log('💡 No modified unit test files — skipping history sampling');
    return;
  }

  if (!env.token) {
    core.warning('No GitHub token — skipping history sampling');
    writeHistoryFile(
      modifiedFiles.map((path) => emptyHistoryFile(path)),
      modifiedFiles,
      env.headSha,
      {
        sampledRunCount: 0,
        candidateShaCount: 0,
        jobListCalls: 0,
        unreadFailedRuns: 0,
      },
    );
    writePriorStateFile(null);
    setStage1Outputs({
      hasTestFiles: true,
      shouldAnalyze: true,
      filesToAnalyze: modifiedFiles,
      skipReason: '',
      modifiedFileCount: modifiedFiles.length,
      historicallyFlakyCount: 0,
      unreadFailedRuns: 0,
      missingPriorShaCount: 0,
    });
    return;
  }

  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token);

  const priorState = await fetchPriorState(octokit, owner, repo);
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
    });
    return;
  }

  writePriorStateFile(priorState);

  const runs = await getCompletedRunsInLookback(octokit);
  const { files, unreadFailedRuns, candidateShaCount, jobListCalls } =
    await buildHistory(octokit, owner, repo, modifiedFiles, runs);
  console.log(
    `🔍 Sampled ${runs.length} completed ci.yml run(s) on any branch over the last ${LOOKBACK_DAYS}d ` +
      `(${candidateShaCount} candidate SHA(s), ${jobListCalls} job-list call(s))`,
  );

  const result = writeHistoryFile(files, needsAnalysis, env.headSha, {
    sampledRunCount: runs.length,
    candidateShaCount,
    jobListCalls,
    unreadFailedRuns,
  });

  const flakyCount = files.filter((f) => f.flaky).length;
  setStage1Outputs({
    hasTestFiles: true,
    shouldAnalyze: true,
    filesToAnalyze: needsAnalysis,
    skipReason: '',
    modifiedFileCount: modifiedFiles.length,
    historicallyFlakyCount: flakyCount,
    unreadFailedRuns,
    missingPriorShaCount,
  });
  console.log(
    `✅ Wrote ${OUTPUT_PATH} — ${flakyCount} of ${files.length} modified test file(s) flagged as historically flaky`,
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: Error) => {
  core.warning(`Stage 1 failed: ${error.message}`);
  core.setOutput('should_analyze', 'false');
  core.setOutput('files_to_analyze', '');
  core.setOutput('skip_reason', 'stage1_crash');
  core.setOutput('files_to_analyze_count', '0');
  core.setOutput('historically_flaky_count', '0');
  core.setOutput('unread_failed_runs', '0');
  core.setOutput('missing_prior_sha_count', '0');
});
