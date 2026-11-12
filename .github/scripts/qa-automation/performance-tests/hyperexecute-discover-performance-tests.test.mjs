import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
const discoverPath = path.join(
  repoRoot,
  '.github',
  'scripts',
  'qa-automation',
  'performance-tests',
  'hyperexecute-discover-performance-tests.sh',
);

function discover(buildType, cwd = repoRoot, grepTags = '') {
  const env = { ...process.env, GREP_TAGS: grepTags };
  if (buildType === undefined) {
    delete env.BUILD_TYPE;
  } else {
    env.BUILD_TYPE = buildType;
  }

  const result = spawnSync('bash', [discoverPath], {
    cwd,
    env,
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stderr: result.stderr,
    specs: result.stdout.split('\n').filter(Boolean),
  };
}

test('imported-wallet discovery includes a bare @Performance login spec', () => {
  const { status, specs } = discover('imported-wallet');

  assert.equal(status, 0);
  assert.ok(specs.includes('tests/performance/login/perps-add-funds.spec.ts'));
});

test('imported-wallet discovery excludes specs tagged only with @System', () => {
  const { specs } = discover('imported-wallet');

  assert.equal(
    specs.includes('tests/performance/login/send-eth-between-accounts.spec.ts'),
    false,
  );
});

test('onboarding discovery includes a bare @Performance onboarding spec', () => {
  const { status, specs } = discover('onboarding');

  assert.equal(status, 0);
  assert.ok(specs.includes('tests/performance/onboarding/import-wallet.spec.ts'));
});

test('onboarding discovery excludes specs with only an area tag', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-discovery-'));
  const onboardingDir = path.join(root, 'tests', 'performance', 'onboarding');
  fs.mkdirSync(onboardingDir, { recursive: true });
  fs.writeFileSync(
    path.join(onboardingDir, 'bare.spec.ts'),
    'test.describe(`${Performance} ${PerformanceOnboarding}`, () => {});\n',
  );
  fs.writeFileSync(
    path.join(onboardingDir, 'area-only.spec.ts'),
    'test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {});\n',
  );

  try {
    const { status, specs } = discover('onboarding', root);

    assert.equal(status, 0);
    assert.deepEqual(specs, ['tests/performance/onboarding/bare.spec.ts']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('onboarding discovery includes cold start after wallet import', () => {
  const { specs } = discover('onboarding');

  assert.ok(
    specs.includes(
      'tests/performance/onboarding/launch-times/cold-start-after-wallet-import.spec.ts',
    ),
  );
});

test('onboarding discovery stays inside the onboarding folder', () => {
  const { specs } = discover('onboarding');

  assert.ok(specs.length > 0);
  assert.ok(specs.every((spec) => spec.startsWith('tests/performance/onboarding/')));
});

test('an empty BUILD_TYPE exits non-zero and asks for one', () => {
  const { status, stderr } = discover('');

  assert.notEqual(status, 0);
  assert.match(stderr, /BUILD_TYPE is required/);
});

test('a missing BUILD_TYPE exits non-zero and asks for one', () => {
  const { status, stderr } = discover(undefined);

  assert.notEqual(status, 0);
  assert.match(stderr, /BUILD_TYPE is required/);
});

test('an unknown BUILD_TYPE exits non-zero and names it', () => {
  const { status, stderr } = discover('ios-smoke');

  assert.notEqual(status, 0);
  assert.match(stderr, /Unknown BUILD_TYPE: ios-smoke/);
});

test('scenario specs are discovered only when @PerformanceShadow is selected', () => {
  const scenario =
    'tests/performance/login/scenarios/eth-swap-flow.scenario.spec.ts';

  assert.equal(discover('imported-wallet').specs.includes(scenario), false);
  assert.equal(
    discover('imported-wallet', repoRoot, '@PerformanceLogin').specs.includes(
      scenario,
    ),
    false,
  );
  assert.ok(
    discover('imported-wallet', repoRoot, '@PerformanceShadow').specs.includes(
      scenario,
    ),
  );
});

test('a @PerfHealTest selection lists only the two tagged scenarios', () => {
  const login = discover('imported-wallet', repoRoot, '@PerfHealTest');
  const onboarding = discover('onboarding', repoRoot, '@PerfHealTest');

  assert.equal(login.status, 0);
  assert.deepEqual(login.specs.sort(), [
    'tests/performance/login/scenarios/asset-view.scenario.spec.ts',
    'tests/performance/login/scenarios/predict-available-balance.scenario.spec.ts',
  ]);
  assert.equal(onboarding.status, 0);
  assert.deepEqual(onboarding.specs, []);
  assert.equal(
    discover('imported-wallet', repoRoot, '@PerfHealTest').specs.includes(
      'tests/performance/login/send-eth-between-accounts.spec.ts',
    ),
    false,
  );
});

test('a @PerformanceShadow-only selection lists only scenario specs', () => {
  const { status, specs } = discover(
    'imported-wallet',
    repoRoot,
    '@PerformanceShadow',
  );

  assert.equal(status, 0);
  assert.ok(specs.length > 0);
  assert.ok(specs.every((spec) => spec.endsWith('.scenario.spec.ts')));

  const mixed = discover(
    'imported-wallet',
    repoRoot,
    '@PerformanceLogin|@PerformanceShadow',
  ).specs;
  assert.ok(mixed.includes('tests/performance/login/eth-swap-flow.spec.ts'));
  assert.ok(mixed.some((spec) => spec.endsWith('.scenario.spec.ts')));
});
