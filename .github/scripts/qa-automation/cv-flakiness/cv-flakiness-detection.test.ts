import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPOSITORY_ROOT = process.cwd();
const SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  '.github/scripts/qa-automation/cv-flakiness/cv-flakiness-detection.mjs',
);

interface JestStubOptions {
  failSubstring?: string;
  sleepMs?: number;
}

/** Jest stub: writes a minimal Jest JSON report and logs every invocation. */
function writeJestStub(stubDir: string, options: JestStubOptions): string {
  const stubPath = path.join(stubDir, 'jest-stub.cjs');
  writeFileSync(
    stubPath,
    `
const fs = require('node:fs');
const args = process.argv.slice(2);
const outputFileIndex = args.indexOf('--outputFile');
const outputFile = outputFileIndex !== -1 ? args[outputFileIndex + 1] : '';
const seedIndex = args.indexOf('--seed');
const seed = seedIndex !== -1 ? args[seedIndex + 1] : '';
const files = args.filter(
  (arg, index) =>
    arg.endsWith('.view.test.tsx') &&
    args[index - 1] !== '--outputFile' &&
    args[index - 1] !== '--seed',
);
const callsPath = process.env.STUB_CALLS_PATH;
if (callsPath) {
  fs.appendFileSync(callsPath, JSON.stringify({ seed, files }) + '\\n');
}
const failSubstring = ${JSON.stringify(options.failSubstring ?? '')};
const sleepMs = ${JSON.stringify(options.sleepMs ?? 0)};
setTimeout(() => {
  const testResults = files.map((file) => {
    const failed = Boolean(failSubstring) && file.includes(failSubstring);
    return {
      name: file,
      status: failed ? 'failed' : 'passed',
      assertionResults: [
        {
          fullName: failed ? 'Stub failing test name' : 'Stub passing test name',
          status: failed ? 'failed' : 'passed',
          failureMessages: failed ? ['Stub failure message'] : [],
        },
      ],
    };
  });
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify({ testResults }));
  }
  process.exit(testResults.some((result) => result.status === 'failed') ? 1 : 0);
}, sleepMs);
`,
  );
  return stubPath;
}

interface FetchStubOptions {
  ok: boolean;
  status: number;
  statusText: string;
  labelNames: string[];
}

/** Fetch stub injected with NODE_OPTIONS=--require for the PR label check. */
function writeFetchStub(stubDir: string, options: FetchStubOptions): string {
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
  status: ${options.status},
  statusText: ${JSON.stringify(options.statusText)},
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
  timeBudgetMinutes?: string;
  deadlineMs?: string;
  labels?: string[];
  fetchOk?: boolean;
  failSubstring?: string;
  sleepMs?: number;
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
    REPOSITORY: 'MetaMask/metamask-mobile',
    PR_NUMBER: '123',
    STUB_CALLS_PATH: callsPath,
    TIME_BUDGET_MINUTES: options.timeBudgetMinutes ?? '60',
  };
  if (options.deadlineMs !== undefined) {
    env.CV_FLAKINESS_DEADLINE_MS = options.deadlineMs;
  }
  const fetchStubPath = writeFetchStub(stubDir, {
    ok: options.fetchOk ?? true,
    status: options.fetchOk === false ? 502 : 200,
    statusText: options.fetchOk === false ? 'Bad Gateway' : 'OK',
    labelNames: options.labels ?? [],
  });
  env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --require ${fetchStubPath}`;

  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: REPOSITORY_ROOT,
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(
      '[cv-flakiness-detection test] script failed:\nstdout:\n%s\nstderr:\n%s',
      result.stdout ?? '',
      result.stderr ?? '',
    );
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
    while (createdDirs.length > 0) {
      const dir = createdDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
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
    const { status, calls, output, summary } = runScript({
      changedFiles: `${first} ${second}`,
      repeatCount: '2',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.files).toHaveLength(2);
    }
    expect(output).toContain('cv_files_to_repeat=');
    expect(output).toContain('completed_iterations=2');
    expect(output).toContain('budget_exhausted=false');
    expect(output).toContain('status=passed');
    expect(summary).toContain('First.view.test.tsx');
    expect(summary).toContain('Second.view.test.tsx');
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
    expect(summary).toContain('Deleted paths (not repeated)');
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
    expect(summary).toContain('Not repeated (capped at 1 files)');
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
    const { status, calls, output } = runScript({
      changedFiles: file,
      fetchOk: false,
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(output).toContain('status=skipped');
  });

  it('stops repeating at the time budget instead of failing', () => {
    const file = makeCvFile(tempDir, 'Slow.view.test.tsx');
    const { status, output, summary, stdout } = runScript({
      changedFiles: file,
      repeatCount: '3',
      sleepMs: 8000,
      // testSetup.js mocks Date.now to a constant, so build the deadline from
      // the real clock for the child process.
      deadlineMs: String(new Date().getTime() + 4000),
    });

    expect(status).toBe(0);
    expect(output).toContain('budget_exhausted=true');
    expect(output).toContain('completed_iterations=1');
    expect(output).toContain('status=budget-limited');
    expect(summary).toContain('Time budget');
    expect(stdout).toContain('did not get all 3 repetitions');
  });

  it('shuffles the file order between repetitions', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) =>
      makeCvFile(tempDir, `${name}Test.view.test.tsx`),
    );
    const { status, calls } = runScript({
      changedFiles: files.join(' '),
      repeatCount: '5',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(5);
    const orders = new Set(calls.map((call) => call.files.join(',')));
    // Five shuffled repetitions of six files are overwhelmingly unlikely to
    // produce one identical order every time without shuffling.
    expect(orders.size).toBeGreaterThan(1);
  });
});
