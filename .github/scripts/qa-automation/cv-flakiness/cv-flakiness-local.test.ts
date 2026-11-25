import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { listChangedFiles } from './cv-flakiness-local.mjs';

const REPOSITORY_ROOT = process.cwd();
const SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  '.github/scripts/qa-automation/cv-flakiness/cv-flakiness-local.mjs',
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
setTimeout(() => {
  const testResults = files.map((file) => {
    const failed = Boolean(failSubstring) && file.includes(failSubstring);
    return {
      name: file,
      status: failed ? 'failed' : 'passed',
      assertionResults: [{
        fullName: failed ? 'Stub failing test name' : 'Stub passing test name',
        status: failed ? 'failed' : 'passed',
        failureMessages: failed ? ['Stub failure message'] : [],
      }],
    };
  });
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify({ testResults, numRuntimeErrorTestSuites: 0 }));
  }
  const anyFailed = testResults.some((result) => result.status === 'failed');
  process.exit(Number.isFinite(forcedExit) ? forcedExit : anyFailed ? 1 : 0);
}, sleepMs);
`,
  );
  return stubPath;
}

/**
 * Git stub on the PATH of the spawned script, so the default changed-file
 * listing is deterministic: `merge-base` succeeds (or fails with
 * GIT_STUB_FAIL), the `--name-only` diffs echo GIT_STUB_DIFF_OUTPUT, and
 * `ls-files --others` echoes GIT_STUB_UNTRACKED_OUTPUT.
 */
function writeGitStub(stubDir: string): void {
  const gitStubPath = path.join(stubDir, 'git');
  writeFileSync(
    gitStubPath,
    `#!/bin/sh
if [ "$1" = "merge-base" ]; then
  if [ -n "$GIT_STUB_FAIL" ]; then
    echo "git-stub: merge-base failed" >&2
    exit 1
  fi
  echo stubbed-merge-base
elif [ "$1" = "ls-files" ]; then
  printf '%s' "$GIT_STUB_UNTRACKED_OUTPUT"
else
  printf '%s' "$GIT_STUB_DIFF_OUTPUT"
fi
`,
  );
  chmodSync(gitStubPath, 0o755);
}

interface LocalRunOptions {
  fileArgs?: string[];
  repeatCount?: string;
  maxFiles?: string;
  deadlineMs?: string;
  failSubstring?: string;
  sleepMs?: number;
  jestNodePath?: string;
  gitDiffOutput?: string;
  gitUntrackedOutput?: string;
  gitFails?: boolean;
}

interface LocalRunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  calls: { seed: string; files: string[] }[];
}

const createdDirs: string[] = [];

function runLocalScript(options: LocalRunOptions): LocalRunResult {
  const stubDir = mkdtempSync(path.join(tmpdir(), 'cv-flakiness-local-'));
  createdDirs.push(stubDir);
  const callsPath = path.join(stubDir, 'calls.jsonl');
  const jestStubPath = writeJestStub(stubDir, {
    failSubstring: options.failSubstring,
    sleepMs: options.sleepMs,
  });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    JEST_BIN_PATH: jestStubPath,
    MAX_FILES: options.maxFiles ?? '10',
    REPEAT_COUNT: options.repeatCount ?? '',
    STUB_CALLS_PATH: callsPath,
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
  if (options.gitDiffOutput !== undefined || options.gitUntrackedOutput !== undefined || options.gitFails) {
    writeGitStub(stubDir);
    env.GIT_STUB_DIFF_OUTPUT = options.gitDiffOutput ?? '';
    env.GIT_STUB_UNTRACKED_OUTPUT = options.gitUntrackedOutput ?? '';
    env.GIT_STUB_FAIL = options.gitFails ? '1' : '';
    env.PATH = `${stubDir}${path.delimiter}${process.env.PATH || ''}`;
  }

  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...(options.fileArgs ?? [])], {
    cwd: REPOSITORY_ROOT,
    env,
    encoding: 'utf8',
  });
  const expectsFailure = Boolean(options.failSubstring || options.gitFails || options.jestNodePath);
  if (result.status !== 0 && !expectsFailure) {
    console.error('[cv-flakiness-local test] script failed:', result.status, '\nstdout:', result.stdout, '\nstderr:', result.stderr);
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
  };
}

function makeCvFile(dir: string, name: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, '');
  return filePath;
}

describe('cv-flakiness-local', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'cv-flakiness-local-files-'));
    createdDirs.push(tempDir);
  });

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('defaults to a low repeat count of 2 when REPEAT_COUNT is unset', () => {
    const first = makeCvFile(tempDir, 'First.view.test.tsx');
    const second = makeCvFile(tempDir, 'Second.view.test.ts');
    const { status, calls, stdout } = runLocalScript({ fileArgs: [first, second] });

    expect(status).toBe(0);
    expect(calls).toHaveLength(2);
    calls.forEach((call) => expect(call.files).toHaveLength(2));
    expect(stdout).toContain('Repeating 2 component view test file(s) 2× (cap 10)');
    expect(stdout).toContain('2/2 repetition(s) completed');
  });

  it('honours the REPEAT_COUNT env override', () => {
    const file = makeCvFile(tempDir, 'Repeated.view.test.tsx');
    const { status, calls } = runLocalScript({ fileArgs: [file], repeatCount: '5' });

    expect(status).toBe(0);
    expect(calls).toHaveLength(5);
  });

  it('ignores arguments that are not component view tests', () => {
    const specFile = makeCvFile(tempDir, 'NotAViewTest.spec.ts');
    const { status, calls, stdout } = runLocalScript({ fileArgs: [specFile] });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(stdout).toContain('No component view test files among the arguments — nothing to repeat.');
  });

  it('stops at the first failing repetition and prints its seed and failing tests', () => {
    const passing = makeCvFile(tempDir, 'Stable.view.test.tsx');
    const failing = makeCvFile(tempDir, 'Flaky.view.test.tsx');
    const { status, calls, stdout, stderr } = runLocalScript({
      fileArgs: [passing, failing],
      repeatCount: '3',
      failSubstring: 'Flaky',
    });

    expect(status).toBe(1);
    // Stops at the first failing repetition instead of running all three.
    expect(calls).toHaveLength(1);
    expect(stdout).toContain(`🔁 Iteration 1/3 (seed ${calls[0].seed})`);
    expect(stderr).toContain(
      `❌ Iteration 1 (seed ${calls[0].seed}) failed with 1 failure(s); stopping at the first failing repetition.`,
    );
    expect(stderr).toContain('Flaky.view.test.tsx › Stub failing test name');
    expect(stderr).toContain(`--randomize --seed ${calls[0].seed}`);
    // The platform is part of the re-run command: TEST_OS decides which
    // platform variants itForPlatforms runs, so without it the seed would
    // exercise a different set of tests in a different order.
    expect(stderr).toContain(
      `TEST_OS=ios yarn jest -c jest.config.view.js --no-watchman --runTestsByPath --randomize --seed ${calls[0].seed}`,
    );
    expect(stderr).toContain(
      'Component view flakiness detected: 1 failure(s) in repetition 1 (seed ' + calls[0].seed + ').',
    );
  });

  it('caps the file list at MAX_FILES with a local warning, not a GitHub annotation', () => {
    const first = makeCvFile(tempDir, 'A-kept.view.test.tsx');
    const second = makeCvFile(tempDir, 'B-dropped.view.test.tsx');
    const { status, calls, stdout } = runLocalScript({
      fileArgs: [second, first],
      maxFiles: '1',
      repeatCount: '1',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].files).toEqual([first]);
    expect(stdout).toContain('Capped at 1 files; not repeating:');
    expect(stdout).not.toContain('::warning::');
  });

  it('treats a repetition killed by the budget as a warning-only stop and exits 0', () => {
    const file = makeCvFile(tempDir, 'Hung.view.test.tsx');
    const { status, calls, stdout } = runLocalScript({
      fileArgs: [file],
      repeatCount: '2',
      // The stub outlasts the whole remaining budget; the 5s deadline leaves room for slow startups.
      sleepMs: 30000,
      deadlineMs: String(new Date().getTime() + 5000),
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(stdout).toContain('was stopped by the remaining time budget');
    expect(stdout).toContain('did not get all 2 repetitions');
    expect(stdout).toContain('0/2 repetition(s) completed');
  });

  it('fails with a clear message when Jest cannot be spawned at all', () => {
    const file = makeCvFile(tempDir, 'Unspawnable.view.test.tsx');
    const missingNode = path.join(tmpdir(), 'cv-flakiness-local-no-such-node');
    const { status, stderr } = runLocalScript({
      fileArgs: [file],
      repeatCount: '1',
      jestNodePath: missingNode,
    });

    expect(status).toBe(1);
    expect(stderr).toContain('Jest could not be started');
  });

  it('defaults to the component view test files changed vs origin/main', () => {
    const first = makeCvFile(tempDir, 'GitA.view.test.tsx');
    const second = makeCvFile(tempDir, 'GitB.view.test.tsx');
    const nonViewTest = makeCvFile(tempDir, 'GitC.spec.ts');
    // An untracked work-in-progress file must be repeated too (Bugbot:
    // untracked view tests are skipped).
    const untracked = makeCvFile(tempDir, 'GitD.view.test.tsx');
    const { status, calls, stdout } = runLocalScript({
      gitDiffOutput: `${first}\n${second}\n${nonViewTest}\n`,
      gitUntrackedOutput: `${untracked}\n`,
      repeatCount: '1',
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    // Repetitions shuffle the file order, so compare as a set.
    expect([...calls[0].files].sort()).toEqual([first, second, untracked].sort());
    expect(stdout).toContain('Repeating 3 component view test file(s) 1× (cap 10)');
  });

  it('fails with guidance when git cannot list the changed files', () => {
    const { status, stderr } = runLocalScript({ gitFails: true });

    expect(status).toBe(1);
    expect(stderr).toContain('Could not list files changed vs origin/main with git');
    expect(stderr).toContain('yarn test:view:repeat path/to/File.view.test.tsx');
  });

  it('reports nothing to repeat when the git diff has no component view tests', () => {
    const { status, calls, stdout } = runLocalScript({ gitDiffOutput: '', repeatCount: '1' });

    expect(status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(stdout).toContain('No component view test files changed vs origin/main — nothing to repeat.');
  });
});

describe('listChangedFiles', () => {
  it('combines the committed diff, uncommitted changes and untracked files', () => {
    const calls: string[][] = [];
    const fakeExecFile = (_command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === 'merge-base') return 'stubbed-merge-base\n';
      if (args[2] === 'stubbed-merge-base') return 'app/Committed.view.test.tsx\n';
      if (args[1] === '--others') return 'app/Untracked.view.test.tsx\n';
      return 'app/Uncommitted.view.test.tsx\n';
    };

    const raw = listChangedFiles({ execFile: fakeExecFile });

    expect(raw).toBe(
      'app/Committed.view.test.tsx\n\napp/Uncommitted.view.test.tsx\n\napp/Untracked.view.test.tsx\n',
    );
    expect(calls).toEqual([
      ['merge-base', 'origin/main', 'HEAD'],
      ['diff', '--name-only', 'stubbed-merge-base', 'HEAD'],
      ['diff', '--name-only', 'HEAD'],
      ['ls-files', '--others', '--exclude-standard'],
    ]);
  });

  it('honours the BASE_REF env override', () => {
    const calls: string[][] = [];
    const fakeExecFile = (_command: string, args: string[]) => {
      calls.push(args);
      return 'app/X.view.test.tsx\n';
    };

    listChangedFiles({ baseRef: 'upstream/develop', execFile: fakeExecFile });

    expect(calls[0]).toEqual(['merge-base', 'upstream/develop', 'HEAD']);
  });
});
