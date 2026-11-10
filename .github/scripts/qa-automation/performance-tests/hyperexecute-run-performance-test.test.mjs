import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const runnerPath = path.join(
  process.cwd(),
  '.github',
  'scripts',
  'qa-automation',
  'performance-tests',
  'hyperexecute-run-performance-test.sh',
);

function runWithFakeYarn(grepTags, testFile, buildType) {
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

  const result = spawnSync('bash', [runnerPath, testFile], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BUILD_TYPE: buildType,
      GREP_TAGS: grepTags,
      FAKE_YARN_ARGS_FILE: argsFile,
      PATH: `${tempDir}:${process.env.PATH}`,
    },
    encoding: 'utf8',
  });

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
  const args = runWithFakeYarn(
    '@PerformanceLogin',
    'tests/performance/login/example.spec.ts',
    'imported-wallet',
  );

  assert.deepEqual(args.slice(-3), [
    '--grep',
    '@PerformanceLogin',
    '--pass-with-no-tests',
  ]);
  assert.ok(args.includes('testmu-android'));
});

test('unfiltered HyperExecute tasks retain strict no-tests failure behavior', () => {
  const args = runWithFakeYarn(
    '',
    'tests/performance/login/example.spec.ts',
    'imported-wallet',
  );

  assert.equal(args.includes('--pass-with-no-tests'), false);
});

test('seedless onboarding specs use the seedless TestMu project', () => {
  const args = runWithFakeYarn(
    '',
    'tests/performance/onboarding/seedless-google-onboarding.spec.ts',
    'onboarding',
  );

  assert.ok(args.includes('testmu-android-onboarding-seedless'));
});

test('scenario specs run through the scenario config and its TestMu project', () => {
  const args = runWithFakeYarn(
    '@PerformanceShadow',
    'tests/performance/login/scenarios/eth-swap-flow.scenario.spec.ts',
    'imported-wallet',
  );

  assert.ok(args.includes('tests/playwright.scenario-shadow.config.ts'));
  assert.ok(args.includes('scenario-shadow-testmu-android'));
  assert.equal(args.includes('tests/playwright.testmu.config.ts'), false);
});

test('onboarding scenario specs use the scenario onboarding projects', () => {
  assert.ok(
    runWithFakeYarn(
      '@PerformanceShadow',
      'tests/performance/onboarding/scenarios/import-wallet.scenario.spec.ts',
      'onboarding',
    ).includes('scenario-shadow-testmu-android-onboarding'),
  );
  assert.ok(
    runWithFakeYarn(
      '@PerformanceShadow',
      'tests/performance/onboarding/scenarios/seedless-google.scenario.spec.ts',
      'onboarding',
    ).includes('scenario-shadow-testmu-android-onboarding-seedless'),
  );
});
