import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReport,
  buildSlackMarkdown,
  classifyRun,
  errorText,
  extractScenarios,
  formatDelta,
  formatDuration,
  formatMadrid,
  percentDelta,
  reasonLabel,
  recordingHref,
  scenariosFromSummary,
  selectRuns,
  splitSlackMessage,
  teamLabel,
} from './daily-performance-report.mjs';

const NOW = new Date('2026-10-28T08:00:00Z');

function scenario(overrides = {}) {
  return {
    testName: 'Cold Start Login',
    device: 'Google Pixel 8 Pro (TestMu HE)+14.0',
    passed: true,
    teamName: 'onboarding',
    totalTimeSec: 4,
    failureReason: null,
    failureMessage: null,
    qualityGates: null,
    recordingUrl: null,
    retried: false,
    ...overrides,
  };
}

function run(overrides = {}) {
  return {
    databaseId: 1,
    createdAt: '2026-10-28T06:00:00Z',
    conclusion: 'success',
    status: 'completed',
    url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/1',
    failedJobs: [],
    scenariosComplete: true,
    scenarios: [scenario()],
    ...overrides,
  };
}

test('formats 08:00 UTC as 09:00 Europe/Madrid in winter', () => {
  assert.equal(formatMadrid('2026-10-28T08:00:00Z'), '28 Oct 2026, 09:00');
});

test('formats durations and percent deltas', () => {
  assert.equal(formatDuration(4.24), '4.2s');
  assert.equal(formatDuration(75), '1m 15s');
  assert.equal(formatDuration(null), '—');
  assert.equal(percentDelta(5, 4), 25);
  assert.equal(formatDelta(percentDelta(4, 5)), '-20%');
  assert.equal(percentDelta(5, 0), null);
});

test('labels failure reasons and strips Slack subteam mentions', () => {
  assert.equal(reasonLabel('quality_gates_exceeded'), 'Quality gates exceeded');
  assert.equal(reasonLabel('timedOut'), 'Timed out');
  assert.equal(
    teamLabel({
      slackMention: '<!subteam^S04NGHK3U9Z|swap-bridge-dev-team>',
    }),
    'swap-bridge-dev-team',
  );
  assert.equal(teamLabel({ teamId: '@accounts-team' }), 'accounts-team');
});

test('collapses a passed retry and keeps the passing duration', () => {
  const scenarios = extractScenarios({
    Android: {
      'Google Pixel 8 Pro (TestMu HE)+14.0': [
        {
          testName: 'Cold Start Login',
          testFailed: true,
          totalTime: 30,
          failureReason: 'timedOut',
          failureMessage: 'Timed out | waiting',
          device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
          team: { teamName: 'Onboarding' },
        },
        {
          testName: 'Cold Start Login',
          totalTime: 4.5,
          device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
          team: { teamName: 'Onboarding' },
          videoURL: 'https://example.com/pass',
        },
      ],
    },
  });

  assert.equal(scenarios.length, 1);
  assert.equal(scenarios[0].passed, true);
  assert.equal(scenarios[0].retried, true);
  assert.equal(scenarios[0].totalTimeSec, 4.5);
  assert.equal(scenarios[0].failureReason, null);
  assert.equal(scenarios[0].teamName, 'Onboarding');
});

test('keeps the latest failure when every attempt failed', () => {
  const scenarios = extractScenarios({
    Android: {
      'Pixel+14.0': [
        {
          testName: 'Send',
          testFailed: true,
          failureReason: 'test_error',
          failureMessage: 'first',
          qualityGates: {
            violations: [{ type: 'total', actual: 9000, threshold: 4000 }],
          },
        },
        {
          testName: 'Send',
          testFailed: true,
          failureReason: 'quality_gates_exceeded',
          failureMessage: 'ignored when gates exist',
          qualityGates: {
            violations: [
              { type: 'step', stepName: 'Confirm', actual: 6500, threshold: 4000 },
            ],
          },
          videoURL: 'https://example.com/fail',
        },
      ],
    },
  });

  assert.equal(scenarios[0].passed, false);
  assert.equal(scenarios[0].totalTimeSec, null);
  assert.equal(errorText(scenarios[0]), 'Confirm 6500ms > 4000ms');
  assert.equal(scenarios[0].recordingUrl, 'https://example.com/fail');
  assert.equal(
    errorText({
      failureReason: 'no_performance_metrics',
      failureMessage:
        'element ("android=new UiSelector().resourceId("predict-market-list-container")") still not displayed after 1846ms',
    }),
    'Element "predict-market-list-container" not found',
  );
  assert.equal(
    recordingHref(
      'https://prod-mobile-artefacts.lambdatest.com/30d/orgId-3245013/2026/10/28/RMAA-AND-3245013-1793148060846709079SZG/video/video.mp4',
    ),
    'https://appautomation.lambdatest.com/test?testID=RMAA-AND-3245013-1793148060846709079SZG',
  );
});

test('reads failed scenarios from a summary when results JSON is missing', () => {
  const scenarios = scenariosFromSummary({
    failedTestsStats: {
      failedTestsByTeam: {
        onboarding: {
          team: { teamName: 'Onboarding' },
          tests: [
            {
              testName: 'Import SRP',
              failureReason: 'test_error',
              failureMessage: 'element missing',
              device: 'Pixel+14.0',
              recordingLink: 'https://example.com/video',
            },
          ],
        },
      },
    },
  });

  assert.equal(scenarios.length, 1);
  assert.equal(scenarios[0].passed, false);
  assert.equal(scenarios[0].teamName, 'Onboarding');
  assert.equal(scenarios[0].recordingUrl, 'https://example.com/video');
});

test('splits scheduled main runs into the last 24 hours and the previous 24 hours', () => {
  const selected = selectRuns(
    [
      { event: 'schedule', headBranch: 'main', createdAt: '2026-10-28T06:00:00Z' },
      { event: 'schedule', headBranch: 'main', createdAt: '2026-10-27T08:00:00Z' },
      { event: 'schedule', headBranch: 'main', createdAt: '2026-10-27T07:59:00Z' },
      { event: 'schedule', headBranch: 'feature', createdAt: '2026-10-28T06:00:00Z' },
      { event: 'workflow_dispatch', headBranch: 'main', createdAt: '2026-10-28T06:00:00Z' },
    ],
    { now: NOW, hours: 24 },
  );

  assert.deepEqual(
    selected.current.map((entry) => entry.createdAt),
    ['2026-10-27T08:00:00Z', '2026-10-28T06:00:00Z'],
  );
  assert.deepEqual(
    selected.previous.map((entry) => entry.createdAt),
    ['2026-10-27T07:59:00Z'],
  );
});

test('classifies workflow failures separately from scenario failures', () => {
  assert.equal(
    classifyRun({ status: 'completed', conclusion: 'failure', uniqueTests: 0, failedTests: 0 }),
    'Workflow failed',
  );
  assert.equal(
    classifyRun({ status: 'completed', conclusion: 'success', uniqueTests: 4, failedTests: 1 }),
    'Failed',
  );
  assert.equal(
    classifyRun({ status: 'in_progress', conclusion: null, uniqueTests: 0, failedTests: 0 }),
    'In progress',
  );
});

test('builds stability, errors, and duration trends from run windows', () => {
  const report = buildReport({
    currentRuns: [
      run({
        databaseId: 11,
        createdAt: '2026-10-28T00:00:00Z',
        scenarios: [
          scenario({ testName: 'Login', totalTimeSec: 4 }),
          scenario({
            testName: 'Send',
            passed: false,
            totalTimeSec: null,
            failureReason: 'test_error',
            failureMessage: 'button | missing',
            recordingUrl: 'https://example.com/send',
          }),
        ],
      }),
      run({
        databaseId: 12,
        createdAt: '2026-10-28T06:00:00Z',
        scenarios: [
          scenario({ testName: 'Login', totalTimeSec: 6 }),
          scenario({ testName: 'Send', totalTimeSec: 3 }),
        ],
      }),
      run({
        databaseId: 13,
        createdAt: '2026-10-28T07:00:00Z',
        conclusion: 'failure',
        scenariosComplete: false,
        scenarios: [],
        summary: { uniqueTests: 0, failedTestsStats: { uniqueFailedTests: 0 } },
        failedJobs: ['Performance Test Android'],
        url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/13',
      }),
    ],
    previousRuns: [
      run({
        databaseId: 1,
        createdAt: '2026-10-27T00:00:00Z',
        scenarios: [
          scenario({ testName: 'Login', totalTimeSec: 4 }),
          scenario({ testName: 'Send', totalTimeSec: 3 }),
        ],
      }),
      run({
        databaseId: 2,
        createdAt: '2026-10-27T06:00:00Z',
        scenarios: [
          scenario({ testName: 'Login', totalTimeSec: 4 }),
          scenario({ testName: 'Send', totalTimeSec: 3 }),
        ],
      }),
    ],
    window: {
      hours: 24,
      currentStart: '2026-10-27T08:00:00Z',
      previousStart: '2026-10-26T08:00:00Z',
      end: NOW.toISOString(),
    },
    repo: 'MetaMask/metamask-mobile',
  });

  const send = report.stability.rows.find((row) => row.name === 'Send');
  assert.equal(report.summary.stable, 1);
  assert.equal(
    report.stability.rows.some((row) => row.name === 'Login'),
    false,
  );
  assert.equal(send.label, 'flaky');
  assert.equal(send.failed, 1);
  assert.equal(send.passed, 1);
  assert.equal(report.summary.workflowFailures, 1);
  assert.equal(report.errors[0].name, 'Send');
  assert.equal(report.errors[0].failedRuns, 1);
  assert.equal(report.errors[0].runsSeen, 2);
  assert.equal(
    report.trends.find((row) => row.name === 'Login').durationPct,
    25,
  );
  assert.equal(
    report.trends.find((row) => row.name === 'Login').durationMoved,
    true,
  );

  const slack = buildSlackMarkdown(report);
  assert.match(slack, /\*Summary\*/);
  assert.match(slack, /\*Test errors\*/);
  assert.match(slack, /\*Stability\*/);
  assert.match(slack, /\*Trends\*/);
  assert.match(slack, /button \\| missing/);
  assert.match(slack, /Performance Test Android/);
  assert.doesNotMatch(slack, /<!subteam/);
  assert.equal(formatMadrid(report.meta.to), '28 Oct 2026, 09:00');
});

test('splits a long Slack message at the stability section', () => {
  const markdown = `${'x'.repeat(4501)}\n*Stability*\nrest`;
  const parts = splitSlackMessage(markdown, 4500);
  assert.equal(parts.length, 2);
  assert.match(parts[1], /^\*Stability\*/);
});
