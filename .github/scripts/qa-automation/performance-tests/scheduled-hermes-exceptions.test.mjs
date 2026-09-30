/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_PREVIOUS_RUNS,
  MIN_BASELINE_RUNS,
  buildPerformanceChannelSlack,
  buildScheduledException,
  buildScheduledExceptionMarkdown,
  buildScheduledExceptionSlack,
  selectBaselineReports,
} from './scheduled-hermes-exceptions.mjs';

function scenario(name, jsWorkMs, projectName = 'browserstack-android') {
  return { projectName, scenario: name, jsWorkMs };
}

function report(runId, scenarios) {
  return {
    meta: {
      runId,
      runUrl: `https://example.com/${runId}`,
      createdAt: `2026-09-23T0${runId}:00:00.000Z`,
      profileCount: scenarios.length,
      symbolicatedProfileCount: scenarios.length,
    },
    scenarios,
  };
}

test('selectBaselineReports keeps only the two most recent scheduled ticks', () => {
  const collected = new Map([
    ['10', report('10', [scenario('Perps add funds', 100)])],
    ['20', report('20', [scenario('Perps add funds', 110)])],
    ['30', report('30', [scenario('Perps add funds', 999)])],
  ]);
  const selected = selectBaselineReports(
    [{ databaseId: 10 }, { databaseId: 20 }, { databaseId: 30 }],
    collected,
  );

  assert.equal(BASELINE_PREVIOUS_RUNS, 2);
  assert.deepEqual(
    selected.map((entry) => entry.meta.runId),
    ['10', '20'],
  );
});

test('selectBaselineReports does not backfill an older run when a tick is missing', () => {
  const collected = new Map([
    ['20', report('20', [scenario('Perps add funds', 110)])],
    ['30', report('30', [scenario('Perps add funds', 999)])],
  ]);
  const selected = selectBaselineReports(
    [{ databaseId: 10 }, { databaseId: 20 }, { databaseId: 30 }],
    collected,
  );

  assert.deepEqual(
    selected.map((entry) => entry.meta.runId),
    ['20'],
  );
});

test('a run below the recent threshold reports an all-clear', () => {
  const current = report('4', [scenario('Perps add funds', 140)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 120)]),
  ];

  const exception = buildScheduledException(current, baseline);
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
  assert.match(slack, /nothing to action/);
  assert.match(slack, /_Checked:_ 1\/1 scenarios/);
  assert.match(slack, /previous 2 scheduled runs/);
  assert.match(slack, /no scenario reached 1\.5× its recent median/);
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /An all-clear was posted/,
  );
});

test('an all-clear names the scenarios that have no baseline yet', () => {
  const current = report('4', [
    scenario('Perps add funds', 140),
    scenario('Money Home after importing SRP with funded balance', 900),
  ]);
  const baseline = [1, 2].map((runId) =>
    report(String(runId), [scenario('Perps add funds', 100)]),
  );

  const slack = buildScheduledExceptionSlack(
    buildScheduledException(current, baseline),
  );

  assert.match(slack, /_Checked:_ 1\/2 scenarios/);
  assert.match(slack, /1 still building a baseline of 2 runs/);
});

test('a scenario at 1.5 times the recent median becomes a finding', () => {
  const current = report('4', [scenario('Perps add funds', 165)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 120)]),
  ];

  const exception = buildScheduledException(current, baseline);
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, true);
  assert.equal(exception.findings[0].baselineMedianJsWorkMs, 110);
  assert.equal(exception.findings[0].ratio, 1.5);
  assert.match(slack, /Possible regression/);
  assert.match(slack, /previous 2 scheduled runs/);
  assert.match(slack, /owner mm-perps-engineering-team/);
  assert.doesNotMatch(slack, /subteam|<!/);
});

test('two scenarios crossing together become one run-level anomaly', () => {
  const current = report('4', [
    scenario('Perps add funds', 200),
    scenario('Money Home after importing SRP with funded balance', 350),
  ]);
  const baseline = [1, 2].map((runId) =>
    report(String(runId), [
      scenario('Perps add funds', 100),
      scenario('Money Home after importing SRP with funded balance', 200),
    ]),
  );

  const exception = buildScheduledException(current, baseline);
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.findings.length, 2);
  assert.match(slack, /one run-level anomaly, not 2 regressions/);
  assert.match(slack, /owner mm-perps-engineering-team/);
  assert.match(slack, /owner mm-earn-team/);
});

test('a finding links the GitHub issue that tracks it', () => {
  const current = report('4', [scenario('Perps add funds', 165)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 120)]),
  ];
  const exception = buildScheduledException(current, baseline);

  const withoutSync = buildScheduledExceptionSlack(exception);
  assert.doesNotMatch(withoutSync, /GitHub issue|issues\//);

  exception.findings[0].issue = {
    number: 501,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/501',
    created: true,
  };
  const opened = buildScheduledExceptionSlack(exception);
  assert.match(opened, /Possible regression/);
  assert.match(opened, /owner mm-perps-engineering-team/);
  assert.match(opened, /#501> opened/);
  assert.doesNotMatch(opened, /subteam|bug opened for review/);
  const performance = buildPerformanceChannelSlack(exception);
  assert.match(performance, /\*App profiling: bug opened for review\*/);
  assert.match(performance, /A bug is open for the owning team/);
  assert.match(
    performance,
    /Owner: <!subteam\^S094DMAQNCV\|mm-perps-engineering-team>/,
  );
  assert.match(
    performance,
    /Bug: <https:\/\/github\.com\/MetaMask\/metamask-mobile\/issues\/501\|#501>/,
  );
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /owner mm-perps-engineering-team — \[#501\]\(https:\/\/github\.com\/MetaMask\/metamask-mobile\/issues\/501\) opened/,
  );

  exception.findings[0].issue.created = false;
  const referenced = buildScheduledExceptionSlack(exception);
  assert.match(referenced, /already open, referenced/);
  assert.equal(buildPerformanceChannelSlack(exception), null);

  exception.findings[0].issue = { error: 'HTTP 403' };
  assert.match(
    buildScheduledExceptionSlack(exception),
    /GitHub issue not created \(HTTP 403\)/,
  );
  assert.equal(buildPerformanceChannelSlack(exception), null);
});

test('a slow run links its single run-level issue', () => {
  const current = report('4', [
    scenario('Perps add funds', 200),
    scenario('Money Home after importing SRP with funded balance', 350),
  ]);
  const baseline = [1, 2].map((runId) =>
    report(String(runId), [
      scenario('Perps add funds', 100),
      scenario('Money Home after importing SRP with funded balance', 200),
    ]),
  );
  const exception = buildScheduledException(current, baseline);
  exception.meta.slowRunIssue = {
    number: 600,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/600',
    created: false,
  };

  const slack = buildScheduledExceptionSlack(exception);

  assert.match(slack, /one run-level anomaly, not 2 regressions/);
  assert.match(slack, /already open for slow runs, referenced/);
  assert.doesNotMatch(slack, /subteam/);
  assert.equal(buildPerformanceChannelSlack(exception), null);
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /GitHub issue: \[#600\]\(.*\/600\) already open for slow runs, referenced/,
  );

  exception.meta.slowRunIssue.created = true;
  const performance = buildPerformanceChannelSlack(exception);
  assert.match(
    performance,
    /\*App profiling: slow run, one bug opened for review\*/,
  );
  assert.match(performance, /<!subteam\^S094DMAQNCV\|mm-perps-engineering-team>/);
  assert.match(performance, /<!subteam\^S052NJFKX6Y\|mm-earn-team>/);
  assert.match(
    buildScheduledExceptionSlack(exception),
    /opened for this slow run/,
  );
});

test('a team without a Slack group is named without a mention', () => {
  const current = report('4', [
    scenario('Rewards tab time-to-content: onboarding or dashboard', 300),
  ]);
  const baseline = [1, 2].map((runId) =>
    report(String(runId), [
      scenario('Rewards tab time-to-content: onboarding or dashboard', 100),
    ]),
  );
  const exception = buildScheduledException(current, baseline);
  exception.findings[0].issue = {
    number: 700,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/700',
    created: true,
  };

  const slack = buildScheduledExceptionSlack(exception);
  const performance = buildPerformanceChannelSlack(exception);

  assert.match(slack, /owner performance-team/);
  assert.doesNotMatch(slack, /subteam|<!/);
  assert.match(performance, /Owner: performance-team/);
  assert.doesNotMatch(performance, /subteam/);
});

test('fewer than two observations only extends the baseline', () => {
  const current = report('3', [scenario('Perps add funds', 1000)]);
  const baseline = [report('1', [scenario('Perps add funds', 100)])];

  const exception = buildScheduledException(current, baseline);

  assert.equal(MIN_BASELINE_RUNS, 2);
  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
});
