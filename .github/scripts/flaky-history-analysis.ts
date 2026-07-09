/**
 * Stage 1 — Deterministic historical analysis (MCWP-474).
 *
 * Identifies Jest unit test files modified in the PR and counts how often each
 * one failed on main over the last LOOKBACK_DAYS of completed ci.yml runs,
 * bucketed into 7d/30d windows. Writes a machine-readable JSON artifact
 * consumed by Stage 2 (AI analyzer) and Stage 3 (sticky PR comment).
 *
 * Historical failure is a HINT, not proof — a file can be flagged here with
 * zero AI findings, or have AI findings with no historical signal.
 *
 * Failure modes are always downgraded to warnings + empty results so the
 * workflow stays informational and never blocks a PR.
 *
 * Design note — why we rely on history + AI patterns only, and deliberately do
 * NOT execute the PR's changed tests or inspect the PR's own ci.yml unit-test
 * run to decide flakiness:
 *
 *   - New test with a flaky pattern: a single PR unit-test run almost never
 *     reproduces the flake, so a run-based signal would usually miss it. AI
 *     pattern detection on the diff is what actually catches this case.
 *   - Existing test changed by the PR: AI detects the pattern AND the run
 *     history on main provides an independent signal, so both fire.
 *   - A modified test with an AI-detected pattern but zero historical failures
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

type Octokit = ReturnType<typeof getOctokit>;

// Prefix of the hidden state block embedded in the sticky comment body.
// Stage 1 reads this to determine which files need re-analysis.
const STATE_MARKER = '<!-- metamask-flaky-test-detection:state';
// Marker used by Stage 3 to identify the sticky comment (must stay in sync).
const COMMENT_MARKER = '<!-- metamask-flaky-test-detection -->';

const WORKFLOW = 'ci.yml';
// JOB_NAME is written into the output artifact as metadata only — it is not
// used to filter the sampled runs. Failure-file intersection is done via FAIL
// lines in the raw job logs, which covers all unit-test shards regardless of
// the exact job name.
const JOB_NAME = 'Unit tests';
// How far back the historical window extends. Failures are bucketed into the
// nested windows below, so a failure 5 days ago counts in both windows and
// one 20 days ago counts only in the 30d bucket.
const LOOKBACK_DAYS = 30;
const WINDOWS_DAYS = [7, 30] as const;
type WindowKey = `${(typeof WINDOWS_DAYS)[number]}d`;
const WINDOW_KEYS = WINDOWS_DAYS.map((d) => `${d}d` as WindowKey);
type WindowCounts = Record<WindowKey, number>;
// Listing runs is cheap (metadata only, 100 per page); the created>= filter is
// the real bound. This cap is just a safety valve against an unbounded page
// walk on an extremely busy repo.
const MAX_RUNS_LISTED = 3000;
// Downloading failed-step logs is the expensive part (one Octokit
// downloadJobLogsForWorkflowRun call per failed job per failed run). Bound the
// total and process failed runs newest-first so the short windows (7d/30d)
// stay accurate even if an unusually red year exceeds the cap — only the
// oldest 365d tail is then undercounted.
const MAX_FAILED_LOG_FETCHES = 200;
// A window needs at least this many countable runs before its failure rate is
// trusted for the flaky flag, so a single early failure in a nearly-empty
// window cannot flag the file on its own.
const MIN_RUNS_FOR_RATE = 5;
// 20% comes from the Jira acceptance criteria: a file is flagged flaky when its
// failure rate reaches this threshold in any window with enough sampled runs.
const FLAKY_THRESHOLD_PERCENT = 20;

// GITHUB_WORKSPACE is always set in Actions; fall back to process.cwd() so
// the script can also be run locally from any directory.
const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const OUTPUT_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');
// Prior per-file state written here for Stage 3 to merge with fresh findings.
const PRIOR_STATE_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-prior-state.json');

// Per-file state persisted inside the sticky comment body. The findings field
// is typed as unknown[] here because Stage 1 only passes it through — Stage 3
// owns the Finding type and casts accordingly.
interface PerFileState {
  analyzedSha: string;
  findings: unknown[];
}

interface CommentState {
  version: number;
  windows: number[];
  files: Record<string, PerFileState>;
}

interface WorkflowRun {
  id: number;
  conclusion: string | null;
  createdAt: string;
}

interface HistoryFile {
  path: string;
  failures: WindowCounts;
  flaky: boolean;
  runHistoryUrl: string;
}

interface HistoryResult {
  generatedAt: string;
  workflow: string;
  job: string;
  branch: string;
  lookbackDays: number;
  windows: number[];
  // Denominator per window (identical across files: it only counts how many
  // countable runs happened in each window, independent of the file).
  runsSampled: WindowCounts;
  threshold: number;
  // Files re-analyzed in this run (subset of files). Stage 3 uses this to
  // decide which entries get fresh AI findings vs. prior findings.
  analyzedFiles: string[];
  // HEAD SHA at which this analysis was run. Embedded per-file so Stage 3
  // can record when each file was last analyzed.
  headSha: string;
  files: HistoryFile[];
}

function emptyWindowCounts(): WindowCounts {
  return WINDOW_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as WindowCounts);
}

// The windows a run of the given age (in days) contributes to — every window
// at least as wide as the run's age.
function windowKeysForAge(ageDays: number): WindowKey[] {
  return WINDOWS_DAYS.filter((d) => ageDays <= d).map((d) => `${d}d` as WindowKey);
}

const env = {
  baseRef: process.env.BASE_REF ?? 'main',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '',
  prNumber: Number(process.env.PR_NUMBER ?? '0'),
  headSha: process.env.HEAD_SHA ?? '',
};

// The diff filter is TS-only because repo policy requires all new code to be
// TypeScript — a modified .js test file in a PR is essentially never expected.
// The failure-log regex still tolerates .js so that legacy pre-migration
// entries in old CI logs don't silently break history sampling.
const UNIT_TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
// Excludes component-view tests (separate CI job/suite) and Detox/Appium e2e
// specs (separate workflows) — this workflow only reasons about Jest unit tests.
const EXCLUDE_PATTERNS = [/\.view\.test\./, /^tests\/(smoke|regression)\//];

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
}

// Extracts the per-file state JSON block embedded in a sticky comment body.
function parseStateFromComment(body: string): CommentState | null {
  const idx = body.indexOf(STATE_MARKER);
  if (idx === -1) return null;
  const after = body.slice(idx + STATE_MARKER.length).trimStart();
  const closeIdx = after.indexOf(' -->');
  if (closeIdx === -1) return null;
  try {
    return JSON.parse(after.slice(0, closeIdx)) as CommentState;
  } catch {
    return null;
  }
}

// Fetches the existing sticky comment and parses its embedded per-file state.
// Returns null when there is no comment yet or the state block is missing/invalid
// (e.g. comments created before this feature shipped).
async function fetchPriorState(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<CommentState | null> {
  if (!env.prNumber) return null;
  try {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: env.prNumber,
      per_page: 100,
    });
    const sticky = comments.find((c) => c.body?.startsWith(COMMENT_MARKER));
    if (!sticky?.body) return null;
    return parseStateFromComment(sticky.body);
  } catch (error) {
    core.warning(`fetchPriorState failed: ${(error as Error).message}`);
    return null;
  }
}

// Returns the subset of modifiedFiles that changed since their last-analyzed SHA.
// Files with no prior state always need analysis. Files whose prior SHA is no
// longer reachable (force-push/rebase) are also treated as changed.
function computeNeedsAnalysis(
  modifiedFiles: string[],
  priorState: CommentState | null,
): string[] {
  if (!priorState) return [...modifiedFiles];

  // Group by prior analyzedSha to batch git diff calls per unique SHA.
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

  for (const [analyzedSha, files] of byAnalyzedSha) {
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
      // Force-push may have orphaned the SHA; treat all files in this group as
      // changed so we re-analyze rather than silently using stale findings.
      core.warning(
        `git diff ${analyzedSha}..HEAD failed — re-analyzing group: ${(error as Error).message}`,
      );
      files.forEach((f) => changedFiles.add(f));
      continue;
    }
    for (const file of files) {
      if (changedInDiff.has(file)) changedFiles.add(file);
    }
  }

  return modifiedFiles.filter((f) => changedFiles.has(f));
}

function getModifiedUnitTestFiles(): string[] {
  let diffOutput: string;
  try {
    diffOutput = sh('git', ['diff', '--name-only', `origin/${env.baseRef}...HEAD`]);
  } catch (error) {
    core.warning(`git diff failed: ${(error as Error).message}`);
    return [];
  }

  return diffOutput
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => UNIT_TEST_FILE_PATTERN.test(f))
    .filter((f) => !EXCLUDE_PATTERNS.some((pattern) => pattern.test(f)));
}

async function getCompletedRunsInLookback(octokit: Octokit): Promise<WorkflowRun[]> {
  const [owner, repo] = env.repo.split('/');
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const runs: WorkflowRun[] = [];
  try {
    // paginate.iterator walks the Link header page-by-page so we can stop at
    // MAX_RUNS_LISTED instead of buffering the whole (potentially huge) year.
    const iterator = octokit.paginate.iterator(octokit.rest.actions.listWorkflowRuns, {
      owner,
      repo,
      workflow_id: WORKFLOW,
      branch: 'main',
      status: 'completed',
      created: `>=${since}`,
      per_page: 100,
    });
    for await (const { data } of iterator) {
      for (const r of data) {
        runs.push({ id: r.id, conclusion: r.conclusion, createdAt: r.created_at });
        if (runs.length >= MAX_RUNS_LISTED) return runs;
      }
    }
  } catch (error) {
    core.warning(`listWorkflowRuns failed: ${(error as Error).message}`);
  }
  return runs;
}

// Extracts every `FAIL <path>` line Jest emits at the top of a failed test
// file's output. For each failed run, lists its jobs via Octokit, keeps only
// the failed jobs, then downloads their plaintext logs one by one.
// downloadJobLogsForWorkflowRun returns plaintext (not a zip archive) so no
// extra dependency is needed and there is no spawnSync buffer cap.
async function getFailedTestFilesForRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
): Promise<string[]> {
  let jobs: { id: number; conclusion: string | null }[];
  try {
    jobs = await octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
      owner,
      repo,
      run_id: runId,
      filter: 'latest',
      per_page: 100,
    });
  } catch (error) {
    core.warning(`listJobsForWorkflowRun ${runId} failed: ${(error as Error).message}`);
    return [];
  }

  const failedJobs = jobs.filter((j) => j.conclusion === 'failure');
  const logParts: string[] = [];
  for (const job of failedJobs) {
    try {
      const res = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: job.id,
      });
      logParts.push(String(res.data));
    } catch (error) {
      core.warning(`downloadJobLogsForWorkflowRun ${job.id} failed: ${(error as Error).message}`);
    }
  }

  const logOutput = logParts.join('\n');
  // Alternation order: try the longest extension first so "tsx" isn't
  // truncated to "ts" by an early match.
  const matches = logOutput.matchAll(/FAIL\s+(\S+\.(?:test|spec)\.(?:tsx|ts|js))(?=\s|$)/gm);
  return [...matches].map((m) => m[1]);
}

// Intersects failed-file names from the sampled runs with the PR's modified
// files, bucketing each failure into every window it falls in. The denominator
// is failure+success runs only — cancelled/timed_out runs don't tell us whether
// the suite passed, so counting them inflates the sample and deflates the rate.
async function buildHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
  modifiedFiles: string[],
  runs: WorkflowRun[],
): Promise<{ files: HistoryFile[]; runsSampled: WindowCounts }> {
  const now = Date.now();
  const ageInDays = (createdAt: string) =>
    (now - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000);

  const countableRuns = runs.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'success',
  );

  const runsSampled = emptyWindowCounts();
  for (const run of countableRuns) {
    for (const key of windowKeysForAge(ageInDays(run.createdAt))) runsSampled[key]++;
  }

  // Newest-first so the failed-log budget is spent on recent runs, keeping the
  // short windows accurate if the cap is ever hit.
  const failedRuns = countableRuns
    .filter((r) => r.conclusion === 'failure')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_FAILED_LOG_FETCHES);

  const failuresByFile = new Map<string, WindowCounts>();
  for (const run of failedRuns) {
    const keys = windowKeysForAge(ageInDays(run.createdAt));
    for (const file of await getFailedTestFilesForRun(octokit, owner, repo, run.id)) {
      if (!modifiedFiles.includes(file)) continue;
      if (!failuresByFile.has(file)) failuresByFile.set(file, emptyWindowCounts());
      const counts = failuresByFile.get(file) as WindowCounts;
      for (const key of keys) counts[key]++;
    }
  }

  const runHistoryUrl = `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}?query=branch%3Amain`;

  const files = modifiedFiles.map((path) => {
    const failures = failuresByFile.get(path) ?? emptyWindowCounts();
    const flaky = WINDOW_KEYS.some((key) => {
      const denominator = runsSampled[key];
      return (
        denominator >= MIN_RUNS_FOR_RATE &&
        (failures[key] / denominator) * 100 >= FLAKY_THRESHOLD_PERCENT
      );
    });
    return { path, failures, flaky, runHistoryUrl };
  });

  return { files, runsSampled };
}

function writeHistoryFile(
  files: HistoryFile[],
  runsSampled: WindowCounts,
  analyzedFiles: string[],
  headSha: string,
): HistoryResult {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const result: HistoryResult = {
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW,
    job: JOB_NAME,
    branch: 'main',
    lookbackDays: LOOKBACK_DAYS,
    windows: [...WINDOWS_DAYS],
    runsSampled,
    threshold: FLAKY_THRESHOLD_PERCENT,
    analyzedFiles,
    headSha,
    files,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  return result;
}

function writePriorStateFile(state: CommentState | null): void {
  mkdirSync(dirname(PRIOR_STATE_PATH), { recursive: true });
  const empty: CommentState = { version: 1, windows: [...WINDOWS_DAYS], files: {} };
  writeFileSync(PRIOR_STATE_PATH, JSON.stringify(state ?? empty, null, 2));
}

async function main(): Promise<void> {
  const modifiedFiles = getModifiedUnitTestFiles();
  console.log(
    `📁 Found ${modifiedFiles.length} modified unit test file(s): ${modifiedFiles.join(', ') || 'none'}`,
  );

  // `has_test_files` gates every subsequent step in the workflow — when there
  // is no unit test in the PR we skip both the AI analyzer invocation and the
  // sticky comment update to avoid LLM cost and noise. `files` is the exact
  // space-separated list passed to `--changed-files` in Stage 2 so the two
  // stages agree on scope (the AI must not analyze production code or e2e).
  core.setOutput('has_test_files', modifiedFiles.length > 0 ? 'true' : 'false');
  core.setOutput('files', modifiedFiles.join(' '));

  if (modifiedFiles.length === 0) {
    writeHistoryFile([], emptyWindowCounts(), [], env.headSha);
    writePriorStateFile(null);
    console.log('💡 No modified unit test files — skipping history sampling');
    return;
  }

  if (!env.token) {
    core.warning('No GitHub token — skipping history sampling');
    // Cannot fetch prior state without a token; re-analyze everything.
    core.setOutput('should_analyze', 'true');
    core.setOutput('files_to_analyze', modifiedFiles.join(' '));
    writeHistoryFile(
      modifiedFiles.map((path) => ({
        path,
        failures: emptyWindowCounts(),
        flaky: false,
        runHistoryUrl: `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}?query=branch%3Amain`,
      })),
      emptyWindowCounts(),
      modifiedFiles,
      env.headSha,
    );
    writePriorStateFile(null);
    return;
  }

  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token);

  // Fetch the prior per-file state embedded in the existing sticky comment.
  // This determines which modified test files actually changed since they were
  // last analyzed — only those files trigger a re-run of history sampling and
  // AI analysis, leaving the comment untouched for unrelated pushes.
  const priorState = await fetchPriorState(octokit, owner, repo);
  const needsAnalysis = computeNeedsAnalysis(modifiedFiles, priorState);

  if (needsAnalysis.length === 0 && priorState !== null) {
    // No modified test file changed since it was last analyzed.
    // Skip all expensive work — history sampling, AI, and comment update —
    // so an unrelated push leaves the existing sticky comment exactly as-is.
    console.log('⏭️  No modified test files changed since last analysis — skipping');
    core.setOutput('should_analyze', 'false');
    core.setOutput('files_to_analyze', '');
    return;
  }

  core.setOutput('should_analyze', 'true');
  core.setOutput('files_to_analyze', needsAnalysis.join(' '));

  // Persist prior state for Stage 3 to merge findings for untouched files.
  writePriorStateFile(priorState);

  const runs = await getCompletedRunsInLookback(octokit);
  const { files, runsSampled } = await buildHistory(octokit, owner, repo, modifiedFiles, runs);
  console.log(
    `🔍 Sampled ${runs.length} completed ci.yml run(s) on main over the last ${LOOKBACK_DAYS}d ` +
      `(${runsSampled['30d']} failure/success within window)`,
  );

  const result = writeHistoryFile(files, runsSampled, needsAnalysis, env.headSha);

  const flakyCount = files.filter((f) => f.flaky).length;
  console.log(
    `✅ Wrote ${OUTPUT_PATH} — ${flakyCount} of ${files.length} modified test file(s) flagged as historically flaky`,
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: Error) => {
  core.warning(`Stage 1 failed: ${error.message}`);
});
