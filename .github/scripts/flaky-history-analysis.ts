/**
 * Stage 1 — Deterministic historical analysis (MCWP-474).
 *
 * Identifies Jest unit test files modified in the PR and checks their
 * historical failure rate over the last RUNS_TO_SAMPLE completed ci.yml
 * runs on main. Writes a machine-readable JSON artifact consumed by Stage 2
 * (AI analyzer) and Stage 3 (sticky PR comment).
 *
 * Historical failure is a HINT, not proof — a file can be flagged here with
 * zero AI findings, or have AI findings with no historical signal.
 *
 * Failure modes are always downgraded to warnings + empty results so the
 * workflow stays informational and never blocks a PR.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const WORKFLOW = 'ci.yml';
// JOB_NAME is written into the output artifact as metadata only — it is not
// used to filter the sampled runs. Failure-file intersection is done via FAIL
// lines in the raw job logs, which covers all unit-test shards regardless of
// the exact job name.
const JOB_NAME = 'Unit tests';
// 10 runs is enough to compute a meaningful rate at the 20% threshold (2/10)
// while keeping the total `gh run view --log-failed` cost bounded (~10 API
// calls per PR). Bumping this raises API cost linearly.
const RUNS_TO_SAMPLE = 10;
// 20% comes from the Jira acceptance criteria. Rounded down to the nearest
// integer failure count against RUNS_TO_SAMPLE, so at 10 runs this means
// "flagged when >= 2 out of 10 recent runs on main failed for this file."
const FLAKY_THRESHOLD_PERCENT = 20;

// GITHUB_WORKSPACE is always set in Actions; fall back to process.cwd() so
// the script can also be run locally from any directory.
const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const OUTPUT_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');

interface WorkflowRun {
  id: number;
  conclusion: string | null;
}

interface HistoryFile {
  path: string;
  failures: number;
  runsSampled: number;
  failureRatePercent: number;
  flaky: boolean;
  runHistoryUrl: string;
}

interface HistoryResult {
  generatedAt: string;
  workflow: string;
  job: string;
  branch: string;
  runsSampled: number;
  threshold: number;
  files: HistoryFile[];
}

const env = {
  baseRef: process.env.BASE_REF ?? 'main',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '',
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

async function getRecentCompletedRuns(
  octokit: ReturnType<typeof getOctokit>,
): Promise<WorkflowRun[]> {
  const [owner, repo] = env.repo.split('/');
  try {
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: WORKFLOW,
      branch: 'main',
      status: 'completed',
      per_page: RUNS_TO_SAMPLE,
    });
    return data.workflow_runs.map((r) => ({ id: r.id, conclusion: r.conclusion }));
  } catch (error) {
    core.warning(`listWorkflowRuns failed: ${(error as Error).message}`);
    return [];
  }
}

// Extracts every `FAIL <path>` line Jest emits at the top of a failed test
// file's output. We use `gh run view --log-failed` here rather than the
// Octokit downloadWorkflowRunLogs endpoint because the latter returns a full
// zip archive that would need to be unzipped and parsed — `gh --log-failed`
// streams only the failed-step output and is materially simpler on runners.
function getFailedTestFilesForRun(runId: number): string[] {
  let logOutput: string;
  try {
    logOutput = sh('gh', ['run', 'view', String(runId), '--repo', env.repo, '--log-failed']);
  } catch (error) {
    core.warning(`gh run view ${runId} failed: ${(error as Error).message}`);
    return [];
  }

  // Alternation order: try the longest extension first so "tsx" isn't
  // truncated to "ts" by an early match.
  const matches = logOutput.matchAll(/FAIL\s+(\S+\.(?:test|spec)\.(?:tsx|ts|js))(?=\s|$)/gm);
  return [...matches].map((m) => m[1]);
}

// Intersects failed-file names from the sampled runs with the PR's modified
// files. The denominator is failure+success runs only — cancelled/timed_out
// runs don't tell us whether the test suite passed, so counting them inflates
// the sample size and deflates the failure rate.
function buildHistory(modifiedFiles: string[], runs: WorkflowRun[]): HistoryFile[] {
  const countableRuns = runs.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'success',
  );
  const failedRuns = countableRuns.filter((r) => r.conclusion === 'failure');
  const failureCounts = new Map<string, number>();

  for (const run of failedRuns) {
    const failedFiles = getFailedTestFilesForRun(run.id);
    for (const file of failedFiles) {
      if (!modifiedFiles.includes(file)) continue;
      failureCounts.set(file, (failureCounts.get(file) ?? 0) + 1);
    }
  }

  const runHistoryUrl = `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}?query=branch%3Amain`;

  return modifiedFiles.map((path) => {
    const failures = failureCounts.get(path) ?? 0;
    const runsSampled = countableRuns.length;
    const failureRatePercent =
      runsSampled > 0 ? Math.round((failures / runsSampled) * 100) : 0;
    return {
      path,
      failures,
      runsSampled,
      failureRatePercent,
      flaky: failureRatePercent >= FLAKY_THRESHOLD_PERCENT,
      runHistoryUrl,
    };
  });
}

function writeHistoryFile(files: HistoryFile[], runsSampled: number): HistoryResult {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const result: HistoryResult = {
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW,
    job: JOB_NAME,
    branch: 'main',
    runsSampled,
    threshold: FLAKY_THRESHOLD_PERCENT,
    files,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  return result;
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
    writeHistoryFile([], 0);
    console.log('💡 No modified unit test files — skipping history sampling');
    return;
  }

  if (!env.token) {
    core.warning('No GitHub token — skipping history sampling');
    writeHistoryFile(
      modifiedFiles.map((path) => ({
        path,
        failures: 0,
        runsSampled: 0,
        failureRatePercent: 0,
        flaky: false,
        runHistoryUrl: `${env.serverUrl}/${env.repo}/actions/workflows/${WORKFLOW}?query=branch%3Amain`,
      })),
      0,
    );
    return;
  }

  const octokit = getOctokit(env.token);
  const runs = await getRecentCompletedRuns(octokit);
  const countableRuns = runs.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'success',
  );
  console.log(
    `🔍 Sampled ${runs.length} completed ci.yml run(s) on main (${countableRuns.length} failure/success)`,
  );

  const files = buildHistory(modifiedFiles, runs);
  const result = writeHistoryFile(files, countableRuns.length);

  const flakyCount = files.filter((f) => f.flaky).length;
  console.log(
    `✅ Wrote ${OUTPUT_PATH} — ${flakyCount} of ${files.length} modified test file(s) flagged as historically flaky`,
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: Error) => {
  core.warning(`Stage 1 failed: ${error.message}`);
});
