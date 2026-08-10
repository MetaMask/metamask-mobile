import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSlackMarkdown,
  selectFeaturedScenarios,
  selectTopLeads,
} from './weekly-app-profiling-report.mjs';

function scenario(rank, scenario, samples, slowFrames, failRatePct) {
  return {
    rank,
    scenario,
    executions: 10,
    failRatePct,
    profiling: {
      samples,
      cpuAvg: { avg: 10 },
      memAvgMb: { avg: 650 },
      memMaxMb: { avg: 800 },
      slowFramesPct: { avg: slowFrames },
      issues: { avg: 2 },
      appSizeMb: { avg: 320 },
    },
  };
}

test('selects at most three high-confidence scenarios for Slack', () => {
  const selected = selectFeaturedScenarios([
    scenario(1, 'Low signal', 1, 40, 0),
    scenario(2, 'Stable flow', 5, 8, 0),
    scenario(3, 'Janky flow', 4, 30, 0),
    scenario(4, 'Flaky flow', 5, 7, 60),
  ]);

  assert.equal(selected.length, 3);
  assert.deepEqual(
    selected.map(({ scenario: name }) => name),
    ['Flaky flow', 'Janky flow', 'Stable flow'],
  );
});

test('limits Slack leads to three and excludes low-confidence leads', () => {
  const selected = selectTopLeads([
    { severity: 'high', theme: 'ui-jank', scenario: 'n=1' },
    { severity: 'high', theme: 'memory', scenario: 'memory' },
    { severity: 'medium', theme: 'test-stability', scenario: 'flake' },
    { severity: 'medium', theme: 'ui-jank', scenario: 'trend' },
  ]);

  assert.equal(selected.length, 3);
  assert.deepEqual(
    selected.map(({ scenario }) => scenario),
    ['memory', 'flake', 'trend'],
  );
});

test('Slack output uses compact sections instead of a wide table', () => {
  const message = buildSlackMarkdown({
    meta: {
      since: '2026-08-03T00:00:00.000Z',
      until: '2026-08-10T00:00:00.000Z',
      days: 7,
      device: 'Pixel 8 Pro',
      profilingSamplesMatched: 10,
      artifactPrs: 3,
    },
    prSummary: { withResults: 5, allPassed: 3, withFailures: 2 },
    scenarios: [scenario(1, 'Important flow', 4, 30, 0)],
    leads: [
      { severity: 'high', theme: 'ui-jank', summary: 'Investigate this.' },
    ],
    aiInsights: '### AI insights to investigate\n1. Investigate this.',
  });

  assert.equal(message.includes('| Scenario |'), false);
  assert.equal(
    message.includes(
      ':warning: *Disclaimer:* This report is for TESTING purposes only',
    ),
    true,
  );
  assert.equal(message.includes('Priority actions'), true);
  assert.equal(message.includes('Important flow'), true);
});
