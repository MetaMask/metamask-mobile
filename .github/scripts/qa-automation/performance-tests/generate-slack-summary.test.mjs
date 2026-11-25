import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildSlackMessage, performanceJobFailed } from './generate-slack-summary.mjs';
import { fileURLToPath } from 'node:url';

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'generate-slack-summary.sh',
);

const RUN_ENV = {
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
  GITHUB_RUN_ID: '44319093875',
};

const RUN_LINK =
  '<https://github.com/MetaMask/metamask-mobile/actions/runs/44319093875|View full results>';

/**
 * The script prints JSON-escaped text. Decode it the way the Slack payload does.
 */
function render(summary, env = RUN_ENV) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slack-summary-'));
  const file = path.join(dir, 'summary.json');
  fs.writeFileSync(file, JSON.stringify(summary));

  const result = spawnSync('bash', [scriptPath, file], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      GITHUB_TOKEN: '',
      GH_TOKEN: '',
    },
  });
  assert.equal(result.status, 0, result.stderr);

  return JSON.parse(`"${result.stdout.trimEnd()}"`);
}

function summary(overrides) {
  return {
    uniqueTests: 25,
    failedTestsStats: { failedTestsByTeam: {} },
    ...overrides,
  };
}

test('lists each failure with its error and TestMu link', () => {
  const text = render(
    summary({
      failedTestsStats: {
        failedTestsByTeam: {
          accounts: {
            tests: [
              {
                testName: 'Import SRP with +50 accounts',
                failureReason: 'no_performance_metrics',
                failureMessage:
                  'Wallet home not ready within 30000ms (Android wallet readiness indicators not satisfied)',
                recordingLink: 'https://example.test/video.mp4',
              },
            ],
          },
          predict: {
            tests: [
              {
                testName: 'Predict Available Balance',
                failureReason: 'no_performance_metrics',
                recordingLink: 'https://example.test/predict.mp4',
              },
            ],
          },
        },
      },
    }),
  );

  assert.equal(
    text,
    [
      '*Performance E2E: 2 of 25 tests failed*',
      '• *Import SRP with +50 accounts* — No performance metrics: Wallet home not ready within 30000ms (Android wallet readiness indicators not satisfied) — <https://example.test/video.mp4|TestMu>',
      '• *Predict Available Balance* — No performance metrics — <https://example.test/predict.mp4|TestMu>',
      '',
      RUN_LINK,
    ].join('\n'),
  );
});

test('uses the same quality-gate sentence as the PR comment', () => {
  const text = render(
    summary({
      failedTestsStats: {
        failedTestsByTeam: {
          onboarding: {
            tests: [
              {
                testName: 'Seedless Onboarding: Apple Login New User',
                failureReason: 'quality_gates_exceeded',
                failureMessage: null,
                recordingLink: 'https://example.test/apple.mp4',
                qualityGates: {
                  passed: false,
                  hasThresholds: true,
                  violations: [
                    {
                      type: 'step',
                      stepName:
                        'Apple: Final onboarding action → wallet main screen visible',
                      actual: 6817,
                      threshold: 5750,
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    }),
  );

  assert.match(
    text,
    /• \*Seedless Onboarding: Apple Login New User\* — Quality gates exceeded: "Apple: Final onboarding action → wallet main screen visible" took 6817 ms > max of 5750 ms — <https:\/\/example\.test\/apple\.mp4\|TestMu>/,
  );
});

test('counts a test that fails on two platforms against the per-platform total', () => {
  const text = buildSlackMessage({
    uniqueTests: 2,
    failedTestsStats: {
      failedTestsByTeam: {
        swaps: {
          tests: [
            { testName: 'Swap flow', platform: 'iOS', failureReason: 'failed' },
            {
              testName: 'Swap flow',
              platform: 'Android',
              failureReason: 'failed',
            },
          ],
        },
      },
    },
  });

  assert.match(text, /^\*Performance E2E: 2 of 2 tests failed\*/);
});

test('says all tests passed when there are no failures', () => {
  const text = render(summary({ uniqueTests: 25 }));

  assert.equal(
    text,
    `:white_check_mark: Performance E2E: all 25 tests passed\n\n${RUN_LINK}`,
  );
});

test('escapes characters that would break the Slack JSON payload', () => {
  const text = render(
    summary({
      failedTestsStats: {
        failedTestsByTeam: {
          team: {
            tests: [
              {
                testName: 'Swap "ETH"',
                failureMessage: 'line one\nline two',
                recordingLink: '',
              },
            ],
          },
        },
      },
    }),
  );

  assert.match(text, /Swap "ETH"/);
  assert.match(text, /line one\nline two/);
});

test('does not call a crashed run a pass', () => {
  const text = buildSlackMessage(
    { uniqueTests: 0, failedTestsStats: { failedTestsByTeam: {} } },
    { runIncomplete: true, runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/1' },
  );

  assert.match(text, /a test job failed before its results were recorded/);
  assert.doesNotMatch(text, /all .* tests passed/);
});

async function jobsReportFailed(jobs) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ jobs }) });
  try {
    return await performanceJobFailed({
      GITHUB_TOKEN: 'token',
      GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
      GITHUB_RUN_ID: '1',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

for (const conclusion of [
  'failure',
  'timed_out',
  'cancelled',
  'startup_failure',
]) {
  test(`treats a performance job that ${conclusion} as incomplete`, async () => {
    assert.equal(
      await jobsReportFailed([{ name: 'Performance Test (iOS)', conclusion }]),
      true,
    );
  });
}

test('ignores successful performance jobs and unrelated failed jobs', async () => {
  assert.equal(
    await jobsReportFailed([
      { name: 'Performance Test (iOS)', conclusion: 'success' },
      { name: 'Run lint', conclusion: 'timed_out' },
    ]),
    false,
  );
});

test('fails when summary.json is not valid JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slack-summary-'));
  const file = path.join(dir, 'summary.json');
  fs.writeFileSync(file, '{');

  const result = spawnSync('bash', [scriptPath, file], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
});

test('reports a missing summary without a run link', () => {
  const result = spawnSync('bash', [scriptPath, '/no/such/summary.json'], {
    encoding: 'utf8',
    env: { ...process.env, ...RUN_ENV },
  });

  assert.equal(result.status, 0);
  assert.equal(
    result.stdout.trimEnd(),
    '⚠️ Performance E2E: no test results available',
  );
});
