import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPOSITORY_ROOT = process.cwd();
const SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  '.github/scripts/qa-automation/cv-flakiness/cv-flakiness-detection.mjs',
);

/** Jest stub: writes a minimal Jest JSON report and logs every invocation. */
function writeJestStub(stubDir: string, options: { failSubstring?: string; sleepMs?: number }): string {
  const stubPath = path.join(stubDir, 'jest-stub.cjs');
  writeFileSync(
    stubPath,
    `
const fs = require('node:fs');
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : ''; };
const outputFile = option('--outputFile');
const files = args.filter((arg, i) => /\.view\.test\.tsx?$/.test(arg) && !['--outputFile', '--seed'].includes(args[i - 1]));
fs.appendFileSync(process.env.STUB_CALLS_PATH, JSON.stringify({ seed: option('--seed'), files }) + '\\n');
const failSubstring = ${JSON.stringify(options.failSubstring ?? '')};
const sleepMs = ${JSON.stringify(options.sleepMs ?? 0)};
const forcedExit = Number(process.env.STUB_EXIT_CODE || '');
const stubReport = process.env.STUB_REPORT || '';
setTimeout(() => {
  if (stubReport === 'invalid') {
    if (outputFile) fs.writeFileSync(outputFile, '{"testResults": [');
    process.exit(1);
  }
  const runtime = stubReport === 'runtime';
  const testResults = files.map((file) => {
    const failed = Boolean(failSubstring) && file.includes(failSubstring);
    const entry = {
      name: file,
      status: failed ? 'failed' : 'passed',
      assertionResults: [{
        fullName: failed ? 'Stub failing test name' : 'Stub passing test name',
        status: failed ? 'failed' : 'passed',
        failureMessages: failed ? ['Stub failure message'] : [],
      }],
    };
    if (runtime) {
      entry.status = 'failed';
      entry.testExecError = 'Cannot find module ../../../missingModule';
    }
    return entry;
  });
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify({ testResults, numRuntimeErrorTestSuites: runtime ? 1 : 0 }));
  }
  const anyFailed = testResults.some((result) => result.status === 'failed');
  process.exit(Number.isFinite(forcedExit) ? forcedExit : anyFailed ? 1 : 0);
}, sleepMs);
`,
  );
  return stubPath;
}

/** Fetch stub injected with NODE_OPTIONS=--require for the PR label check. */
function writeFetchStub(stubDir: string, options: { ok: boolean; labelNames: string[] }): string {
  const fetchStubPath = path.join(stubDir, 'fetch-stub.cjs');
  const body = JSON.stringify({
    data: {
      repository: {
        pullRequest: { labels: { nodes: options.labelNames.map((name) => ({ name })) } },
      },
    },
  });
  writeFileSync(
    fetchStubPath,
    `global.fetch = async () => ({
  ok: ${options.ok},
  status: ${options.ok ? 200 : 502},
  statusText: ${JSON.stringify(options.ok ? 'OK' : 'Bad Gateway')},
  json: async () => (${body}),
});
`,
  );
  return fetchStubPath;
}

interface RunOptions {
  changedFiles: string;
  repeatCount?: string;
  maxFiles?: string;
  deadlineMs?: string;
  labels?: string[];
  fetchOk?: boolean;
  failSubstring?: string;
  sleepMs?: number;
  stubExitCode?: string;
  stubReport?: string;
  jestNodePath?: string;
}

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  calls: { seed: string; files: string[] }[];
  output: string;
  summary: string;
}

const createdDirs: string[] = [];

function runScript(options: RunOptions): RunResult {
  const stubDir = mkdtempSync(path.join(tmpdir(), 'cv-flakiness-stub-'));
  createdDirs.push(stubDir);
  const callsPath = path.join(stubDir, 'calls.jsonl');
  const outputPath = path.join(stubDir, 'github-output');
  const summaryPath = path.join(stubDir, 'step-summary');
  const jestStubPath = writeJestStub(stubDir, {
    failSubstring: options.failSubstring,
    sleepMs: options.sleepMs,
  });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CHANGED_CV_TEST_FILES: options.changedFiles,
    GITHUB_OUTPUT: outputPath,
    GITHUB_STEP_SUMMARY: summaryPath,
    JEST_BIN_PATH: jestStubPath,
    MAX_FILES: options.maxFiles ?? '10',
    REPEAT_COUNT: options.repeatCount ?? '5',
    PR_NUMBER: '123',
    STUB_CALLS_PATH: callsPath,
    STUB_EXIT_CODE: options.stubExitCode ?? '',
    STUB_REPORT: options.stubReport ?? '',
    TIME_BUDGET_MINUTES: '60',
    // Keep per-run Jest JSON reports out of the shared repository tree so a
    // killed run cannot read a previous test's stale report.
    CV_FLAKINESS_RESULTS_DIR: path.join(stubDir, 'cv-flakiness-results'),
  };
  if (options.deadlineMs !== undefined) {
    env.CV_FLAKINESS_DEADLINE_MS = options.deadlineMs;
  }
  if (options.jestNodePath !== undefined) {
    env.JEST_NODE_PATH = options.jestNodePath;
  }
  const fetchStubPath = writeFetchStub(stubDir, {
    ok: options.fetchOk ?? true,
    labelNames: options.labels ?? [],
  });
  env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --require ${fetchStubPath}`;

  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: REPOSITORY_ROOT,
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error('[cv-flakiness-detection test] script failed:', result.status, '\nstdout:', result.stdout, '\nstderr:', result.stderr);
  }
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    calls: existsSync(callsPath)
      ? readFileSync(callsPath, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [],
    output: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '',
    summary: existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : '',
  };
}
function makeCvFile(dir: string, name: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, '');
  return filePath;
}

describe('cv-flakiness-detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'cv-flakiness-files-'));
    createdDirs.push(tempDir);
  });

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips without running jest when no component view test files changed', () => {
    const { status, calls, output } = runScript({ changedFiles: '' });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(output).toContain('status=skipped');
    expect(output).toContain('cv_files_to_repeat=');
  });

  it('ignores files that are not component view tests', () => {
    const specFile = makeCvFile(tempDir, 'NotAViewTest.spec.ts');
    const { status, calls } = runScript({ changedFiles: specFile });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('runs changed component view tests once per repetition', () => {
    const first = makeCvFile(tempDir, 'First.view.test.tsx');
    const second = makeCvFile(tempDir, 'Second.view.test.tsx');
    const tsOnly = makeCvFile(tempDir, 'Third.view.test.ts');
    const { status, calls, output, summary } = runScript({
      changedFiles: `${first} ${second} ${tsOnly}`,
      repeatCount: '2',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(2);
    calls.forEach((call) => expect(call.files).toHaveLength(3));
    expect(output).toContain(path.relative(REPOSITORY_ROOT, tsOnly));
    expect(output).toContain('cv_files_to_repeat=');
    expect(output).toContain('completed_iterations=2');
    expect(output).toContain('budget_exhausted=false');
    expect(output).toContain('status=passed');
    expect(summary).toContain('First.view.test.tsx');
    expect(summary).toContain('Second.view.test.tsx');
    expect(summary).toContain('Third.view.test.ts');
    expect(summary).toContain('| 1 |');
    expect(summary).toContain('| 2 |');
  });

  it('fails and names the test when a repetition fails', () => {
    const passing = makeCvFile(tempDir, 'Stable.view.test.tsx');
    const failing = makeCvFile(tempDir, 'Flaky.view.test.tsx');
    const { status, output, summary, stderr } = runScript({
      changedFiles: `${passing} ${failing}`,
      repeatCount: '2',
      failSubstring: 'Flaky',
    });

    expect(status).toBe(1);
    expect(output).toContain('status=failed');
    expect(summary).toContain('Flaky.view.test.tsx › Stub failing test name');
    expect(summary).toContain('Stable.view.test.tsx` | 2 | 0 |');
    expect(stderr).toContain('CV flakiness detected');
    expect(stderr).toContain('Flaky.view.test.tsx');
  });

  // A repetition that does not end cleanly must fail the job (Bugbot).
  it.each([
    ['non-zero exit, passing assertions', { stubExitCode: '1' }, 'non-zero status'],
    ['unparsable report', { stubExitCode: '1', stubReport: 'invalid' }, 'unparsable'],
    ['suite runtime error', { stubReport: 'runtime' }, 'suite failed to run'],
  ])('fails the job on %s', (_description, options, expectedReason) => {
    const file = makeCvFile(tempDir, 'Crashy.view.test.tsx');
    const { status, output, stderr } = runScript({
      changedFiles: file,
      repeatCount: '1',
      ...options,
    });

    expect(status).toBe(1);
    expect(output).toContain('status=failed');
    expect(stderr).toContain(expectedReason);
  });

  it('fails the job when the budget kills Jest mid-run, reported as a timeout', () => {
    const file = makeCvFile(tempDir, 'Hung.view.test.tsx');
    const { status, output, stderr } = runScript({
      changedFiles: file,
      repeatCount: '1',
      // The stub outlasts the whole remaining budget; the 5s deadline leaves room for slow startups.
      sleepMs: 30000,
      deadlineMs: String(new Date().getTime() + 5000),
    });

    expect(status).toBe(1);
    expect(output).toContain('status=failed');
    // The mid-run kill reads as a timeout, not a start failure (Bugbot r4679772868).
    expect(stderr).toContain('aborted (SIGTERM) after exceeding the remaining time budget');
  });

  it('fails the job when Jest cannot be spawned at all', () => {
    const file = makeCvFile(tempDir, 'Unspawnable.view.test.tsx');
    const missingNode = path.join(tmpdir(), 'cv-flakiness-no-such-node');
    const { status, output, stderr } = runScript({
      changedFiles: file,
      repeatCount: '1',
      jestNodePath: missingNode,
    });

    expect(status).toBe(1);
    expect(output).toContain('status=failed');
    expect(stderr).toContain('Jest could not be started');
  });

  it('stops before starting when the budget is already exhausted', () => {
    const file = makeCvFile(tempDir, 'Slow.view.test.tsx');
    const { status, output, stdout } = runScript({
      changedFiles: file,
      repeatCount: '3',
      // Real-clock deadline (Date.now is mocked); a past deadline exercises the deliberate pre-start stop.
      deadlineMs: String(new Date().getTime() - 1000),
    });

    expect(status).toBe(0);
    expect(output).toContain('budget_exhausted=true');
    expect(output).toContain('completed_iterations=0');
    expect(output).toContain('status=budget-limited');
    expect(stdout).toContain('did not get all 3 repetitions');
  });

  it('drops deleted component view test files without failing', () => {
    const existing = makeCvFile(tempDir, 'Kept.view.test.tsx');
    const deleted = path.join(tempDir, 'Deleted.view.test.tsx');
    const { status, calls, output, summary } = runScript({
      changedFiles: `${existing} ${deleted}`,
      repeatCount: '1',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].files).toEqual([existing]);
    expect(output).toContain(`cv_files_to_repeat=${path.relative(REPOSITORY_ROOT, existing)}`);
    expect(summary).toContain('Not repeated');
    expect(summary).toContain('deleted: `');
    expect(summary).toContain('Deleted.view.test.tsx');
  });

  it('caps the number of repeated files', () => {
    const first = makeCvFile(tempDir, 'A-first.view.test.tsx');
    const second = makeCvFile(tempDir, 'B-second.view.test.tsx');
    const { status, calls, summary, stdout } = runScript({
      changedFiles: `${second} ${first}`,
      maxFiles: '1',
      repeatCount: '1',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].files).toEqual([first]);
    expect(summary).toContain('capped at 1 files');
    expect(stdout).toContain('CV flakiness detection capped at 1 files');
  });

  it('skips flakiness detection when the skip label is present', () => {
    const file = makeCvFile(tempDir, 'Skipped.view.test.tsx');
    const { status, calls, output, summary } = runScript({
      changedFiles: file,
      labels: ['skip-cv-flakiness-detection'],
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(output).toContain('status=skipped');
    expect(summary).toContain('skip-cv-flakiness-detection');
    expect(summary).toContain('Skipped.view.test.tsx');
  });

  it('skips flakiness detection when the GitHub API is unavailable', () => {
    const file = makeCvFile(tempDir, 'ApiDown.view.test.tsx');
    const { status, calls, output } = runScript({ changedFiles: file, fetchOk: false });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(output).toContain('status=skipped');
  });

  it('shuffles the file order between repetitions', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) =>
      makeCvFile(tempDir, `${name}Test.view.test.tsx`),
    );
    const { status, calls } = runScript({ changedFiles: files.join(' '), repeatCount: '5' });

    expect(status).toBe(0);
    expect(calls).toHaveLength(5);
    const orders = new Set(calls.map((call) => call.files.join(',')));
    // One identical order across five shuffled repetitions would be astronomically unlikely.
    expect(orders.size).toBeGreaterThan(1);
  });
});
