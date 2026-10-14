/**
 * Stage 1 — Deterministic historical analysis (MCWP-474).
 *
 * Identifies Jest unit test files modified in the PR and looks up whether each
 * one has a same-SHA fail-then-pass on record. Writes a machine-readable JSON
 * artifact consumed by Stage 2 (AI analyzer) and Stage 3 (sticky PR comment).
 *
 * The history itself comes from the index flaky-unit-test-index.yml builds
 * nightly on main. This stage used to derive it per PR, re-walking thousands
 * of ci.yml runs on every push to answer a question about a handful of files,
 * against a GraphQL budget shared with every other workflow. That walk now
 * happens once a night and this stage is a lookup, which is what lets the
 * window be 90 days instead of 14 and finish in seconds instead of minutes.
 *
 * Moved files are looked up under their prior paths too, since the index is
 * keyed by the path a test had when it failed, and a test that flaked last
 * week does not stop being flaky because it changed directory.
 *
 * Logging rule:
 *   - core.info — expected no-op (no modified tests, unchanged since last
 *     analysis, no index yet).
 *   - core.warning — degraded but still correct (stale or gappy index).
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { withRetryOnce } from './flaky-github-request';
import { jobLogUrl } from './flaky-same-sha-history';
import {
  emptyIndex,
  indexCoverage,
  indexTotals,
  parseIndex,
  toDayKey,
  UNKNOWN_STALE_DAYS,
  type IndexCoverage,
} from './flaky-history-index';
import {
  countCarriedAcrossMove,
  parsePriorPaths,
  resolveHistoryForFiles,
} from './flaky-history-lookup';
import { isFlakyWorkflowUnitTestPath } from './flaky-unit-test-path';
import {
  commentFileSetChanged,
  computeNeedsAnalysis,
} from './flaky-needs-analysis';
import { COMMENT_MARKER, parseStateFromComment } from './flaky-comment-state';
import type {
  CommentState,
  HistoryArtifact,
  HistoryFile,
  HistoryIndex,
} from './flaky-types';

type Octokit = ReturnType<typeof getOctokit>;

const WORKFLOW = 'ci.yml';
const JOB_NAME = 'Unit tests';

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
  /** Where the download step put the nightly index, if it resolved one. */
  indexPath: process.env.FLAKY_INDEX_PATH ?? '',
};

function workflowRunsUrl(): string {
  return `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}`;
}

function exampleJobLogUrl(runId: number, jobId: number): string {
  return jobLogUrl(env.serverUrl, env.repo, runId, jobId);
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

/**
 * The names this file had earlier in the index window.
 *
 * Bounded by the window because a rename older than the index cannot have left
 * history in it, and `--follow` on an unbounded log is expensive on a repo
 * this size.
 */
function priorPathsForFile(path: string, since: string): string[] {
  try {
    const output = sh('git', [
      'log',
      '--follow',
      '--name-only',
      '--format=',
      ...(since ? [`--since=${since}`] : []),
      '--',
      path,
    ]);
    return parsePriorPaths(output, path);
  } catch (error) {
    // A file with no rename history is the common case, not an error worth
    // failing a stage over.
    core.info(
      `git log --follow ${path} failed, treating it as never moved: ${(error as Error).message}`,
    );
    return [];
  }
}

type Stage1SkipReason =
  | 'no_modified_unit_tests'
  | 'unchanged_since_last_analysis'
  | 'stage1_crash'
  | 'git_diff_failed'
  | 'missing_token'
  | 'prior_state_fetch_failed'
  | '';

const NO_COVERAGE: IndexCoverage = {
  staleDays: UNKNOWN_STALE_DAYS,
  daysCovered: 0,
  gapDays: [],
  oldestDay: '',
  newestDay: '',
  complete: false,
};

/** One cell for the Summary table: what the index covers, and how fresh. */
export function describeCoverageWindow(coverage: IndexCoverage): string {
  if (coverage.daysCovered === 0) {
    return 'index unavailable';
  }
  const stale = coverage.staleDays > 2 ? `, ${coverage.staleDays}d stale` : '';
  const gaps =
    coverage.gapDays.length > 0
      ? `, ${coverage.gapDays.length} gap day(s)`
      : '';
  return `${coverage.oldestDay} → ${coverage.newestDay}, ${coverage.daysCovered}d${stale}${gaps}`;
}

function setStage1Outputs({
  hasTestFiles,
  shouldAnalyze,
  filesToAnalyze,
  skipReason,
  modifiedFileCount,
  historicallyFlakyCount,
  carriedAcrossMove = 0,
  missingLogBlobs,
  infrastructureFailures = 0,
  unattributedReruns = 0,
  coverage = NO_COVERAGE,
  missingPriorShaCount,
  historyComplete,
}: {
  hasTestFiles: boolean;
  shouldAnalyze: boolean;
  filesToAnalyze: string[];
  skipReason: Stage1SkipReason;
  modifiedFileCount: number;
  historicallyFlakyCount: number;
  carriedAcrossMove?: number;
  missingLogBlobs: number;
  infrastructureFailures?: number;
  unattributedReruns?: number;
  coverage?: IndexCoverage;
  missingPriorShaCount: number;
  historyComplete: boolean;
}): void {
  core.setOutput('has_test_files', hasTestFiles ? 'true' : 'false');
  core.setOutput('should_analyze', shouldAnalyze ? 'true' : 'false');
  core.setOutput('files_to_analyze', filesToAnalyze.join(' '));
  core.setOutput('skip_reason', skipReason);
  core.setOutput('modified_file_count', String(modifiedFileCount));
  core.setOutput('files_to_analyze_count', String(filesToAnalyze.length));
  core.setOutput('historically_flaky_count', String(historicallyFlakyCount));
  core.setOutput('carried_across_move', String(carriedAcrossMove));
  core.setOutput('missing_log_blobs', String(missingLogBlobs));
  core.setOutput('infrastructure_failures', String(infrastructureFailures));
  core.setOutput('unattributed_reruns', String(unattributedReruns));
  core.setOutput('missing_prior_sha_count', String(missingPriorShaCount));
  core.setOutput('history_complete', historyComplete ? 'true' : 'false');
  core.setOutput('history_window', describeCoverageWindow(coverage));
}

// setFailed + Summary outputs; deliberately omit has_test_files so Stage 3
// never takes the "no unit tests → all-clear" path after a Stage 1 failure.
function failStage1(
  message: string,
  skipReason: Stage1SkipReason,
  counts?: {
    modifiedFileCount?: number;
    missingPriorShaCount?: number;
  },
): void {
  core.setFailed(message);
  core.setOutput('should_analyze', 'false');
  core.setOutput('files_to_analyze', '');
  core.setOutput('skip_reason', skipReason);
  core.setOutput('files_to_analyze_count', '0');
  core.setOutput('historically_flaky_count', '0');
  core.setOutput('carried_across_move', '0');
  core.setOutput('modified_file_count', String(counts?.modifiedFileCount ?? 0));
  core.setOutput('missing_log_blobs', '0');
  core.setOutput('infrastructure_failures', '0');
  core.setOutput('unattributed_reruns', '0');
  core.setOutput('history_window', describeCoverageWindow(NO_COVERAGE));
  core.setOutput(
    'missing_prior_sha_count',
    String(counts?.missingPriorShaCount ?? 0),
  );
  core.setOutput('history_complete', 'false');
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

/**
 * A missing or unreadable index is a degraded run, not a failed one: the AI
 * pattern signal still stands on its own, and the comment says the history
 * column is unknown rather than claiming the files are clean.
 */
function loadIndex(): HistoryIndex {
  if (env.indexPath === '' || !existsSync(env.indexPath)) {
    core.info(
      'No flaky history index available; past flakiness will be reported as unknown.',
    );
    return emptyIndex();
  }
  const parsed = parseIndex(readFileSync(env.indexPath, 'utf8'));
  if (!parsed) {
    core.warning(
      `Flaky history index at ${env.indexPath} could not be read; past flakiness will be reported as unknown.`,
    );
    return emptyIndex();
  }
  return parsed;
}

function writeHistoryFile(
  files: HistoryFile[],
  analyzedFiles: string[],
  headSha: string,
  meta: {
    coverage: IndexCoverage;
    indexRunsScanned: number;
    historyComplete: boolean;
    missingLogBlobs: number;
    infrastructureFailures: number;
    unattributedReruns: HistoryArtifact['unattributedReruns'];
    unattributedRerunCount: number;
    carriedAcrossMove: number;
  },
): HistoryArtifact {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const result: HistoryArtifact = {
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW,
    job: JOB_NAME,
    coverage: meta.coverage,
    indexRunsScanned: meta.indexRunsScanned,
    historyComplete: meta.historyComplete,
    missingLogBlobs: meta.missingLogBlobs,
    infrastructureFailures: meta.infrastructureFailures,
    unattributedReruns: meta.unattributedReruns,
    unattributedRerunCount: meta.unattributedRerunCount,
    carriedAcrossMove: meta.carriedAcrossMove,
    analyzedFiles,
    headSha,
    files,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  return result;
}

function writePriorStateFile(state: CommentState | null): void {
  mkdirSync(dirname(PRIOR_STATE_PATH), { recursive: true });
  const empty: CommentState = { version: 1, windows: [], files: {} };
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
      coverage: NO_COVERAGE,
      indexRunsScanned: 0,
      historyComplete: true,
      missingLogBlobs: 0,
      infrastructureFailures: 0,
      unattributedReruns: [],
      unattributedRerunCount: 0,
      carriedAcrossMove: 0,
    });
    writePriorStateFile(null);
    setStage1Outputs({
      hasTestFiles: false,
      shouldAnalyze: false,
      filesToAnalyze: [],
      skipReason: 'no_modified_unit_tests',
      modifiedFileCount: 0,
      historicallyFlakyCount: 0,
      missingLogBlobs: 0,
      missingPriorShaCount: 0,
      historyComplete: true,
    });
    console.log('💡 No modified unit test files — skipping history lookup');
    return;
  }

  if (!env.token) {
    failStage1('No GitHub token — cannot read prior state', 'missing_token', {
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
      missingLogBlobs: 0,
      missingPriorShaCount,
      historyComplete: true,
    });
    return;
  }

  writePriorStateFile(priorState);

  const index = loadIndex();
  const totals = indexTotals(index);
  const coverage = indexCoverage(index, toDayKey(new Date()));
  if (coverage.daysCovered > 0 && !coverage.complete) {
    core.warning(
      `Flaky history index is ${coverage.staleDays} day(s) old with ${coverage.gapDays.length} gap day(s); history is a lower bound.`,
    );
  }

  const files = resolveHistoryForFiles({
    index,
    modifiedFiles,
    priorPathsFor: (path) => priorPathsForFile(path, coverage.oldestDay),
    jobLogUrlFor: exampleJobLogUrl,
    runHistoryUrl: workflowRunsUrl(),
  });
  const carriedAcrossMove = countCarriedAcrossMove(files);

  console.log(
    `🔍 Index covers ${describeCoverageWindow(coverage)} over ${totals.runsScanned} ci run(s); ` +
      `coverage ${coverage.complete ? 'complete' : 'incomplete'}`,
  );

  // Stage 2 only re-runs files that still need a review. Historically flaky
  // files that already have patternsReviewed stay out so they cannot fill the
  // per-run cap and starve files waiting for retry.
  const filesToAnalyze = needsAnalysis;
  const result = writeHistoryFile(files, filesToAnalyze, env.headSha, {
    coverage,
    indexRunsScanned: totals.runsScanned,
    historyComplete: coverage.complete,
    missingLogBlobs: totals.missingLogBlobs,
    infrastructureFailures: totals.infrastructureFailures,
    unattributedReruns: index.unattributedReruns,
    unattributedRerunCount: totals.unattributedReruns,
    carriedAcrossMove,
  });

  const flakyCount = files.filter((f) => f.flaky).length;
  setStage1Outputs({
    hasTestFiles: true,
    shouldAnalyze: true,
    filesToAnalyze,
    skipReason: '',
    modifiedFileCount: modifiedFiles.length,
    historicallyFlakyCount: flakyCount,
    carriedAcrossMove,
    missingLogBlobs: totals.missingLogBlobs,
    infrastructureFailures: totals.infrastructureFailures,
    unattributedReruns: totals.unattributedReruns,
    coverage,
    missingPriorShaCount,
    historyComplete: coverage.complete,
  });
  console.log(
    `✅ Wrote ${OUTPUT_PATH} — ${flakyCount} of ${files.length} modified test file(s) flagged as historically flaky` +
      (carriedAcrossMove > 0
        ? `, ${carriedAcrossMove} carried across a move`
        : ''),
  );
  console.log(JSON.stringify(result, null, 2));
}

// Guarded so tests can import the pure helpers above without running the stage.
if (require.main === module) {
  main().catch((error: Error) => {
    failStage1(`Stage 1 failed: ${error.message}`, 'stage1_crash');
  });
}
