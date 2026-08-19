import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const runnerPath = path.join(
  process.cwd(),
  'tests',
  'scripts',
  'hyperexecute-run-performance-test.sh',
);

function runWithFakeYarn(grepTags) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'hyperexecute-performance-runner-'),
  );
  const argsFile = path.join(tempDir, 'yarn-args.txt');
  const yarnPath = path.join(tempDir, 'yarn');

  fs.writeFileSync(
    yarnPath,
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "$FAKE_YARN_ARGS_FILE"\n`,
    { mode: 0o755 },
  );

  const result = spawnSync(
    'bash',
    [runnerPath, 'tests/performance/login/example.spec.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BUILD_TYPE: 'imported-wallet',
        GREP_TAGS: grepTags,
        FAKE_YARN_ARGS_FILE: argsFile,
        PATH: `${tempDir}:${process.env.PATH}`,
      },
      encoding: 'utf8',
    },
  );

  const args = fs.existsSync(argsFile)
    ? fs.readFileSync(argsFile, 'utf8').trim().split('\n')
    : [];
  fs.rmSync(tempDir, { recursive: true, force: true });

  assert.equal(
    result.status,
    0,
    `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return args;
}

test('filtered HyperExecute tasks allow files with no matching tests', () => {
  const args = runWithFakeYarn('@PerformanceLogin');

  assert.deepEqual(args.slice(-3), [
    '--grep',
    '@PerformanceLogin',
    '--pass-with-no-tests',
  ]);
});

test('unfiltered HyperExecute tasks retain strict no-tests failure behavior', () => {
  const args = runWithFakeYarn('');

  assert.equal(args.includes('--pass-with-no-tests'), false);
});
