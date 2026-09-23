/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MIN_BASELINE_RUNS,
  buildScheduledException,
  buildScheduledExceptionMarkdown,
  buildScheduledExceptionSlack,
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

test('a run below the recent threshold stays silent', () => {
  const current = report('4', [scenario('Perps add funds', 140)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 110)]),
    report('3', [scenario('Perps add funds', 120)]),
  ];

  const exception = buildScheduledException(current, baseline);

  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
  assert.equal(buildScheduledExceptionSlack(exception), '');
  assert.match(buildScheduledExceptionMarkdown(exception), /No Slack message/);
});

test('a scenario at 1.5 times the recent median becomes a finding', () => {
  const current = report('4', [scenario('Perps add funds', 165)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 110)]),
    report('3', [scenario('Perps add funds', 120)]),
  ];

  const exception = buildScheduledException(current, baseline);
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, true);
  assert.equal(exception.findings[0].baselineMedianJsWorkMs, 110);
  assert.equal(exception.findings[0].ratio, 1.5);
  assert.match(slack, /Possible regression/);
  assert.match(slack, /owner mm-perps-engineering-team/);
  assert.doesNotMatch(slack, /subteam|<!/);
});

test('two scenarios crossing together become one run-level anomaly', () => {
  const current = report('4', [
    scenario('Perps add funds', 200),
    scenario('Money Home after importing SRP with funded balance', 350),
  ]);
  const baseline = [1, 2, 3].map((runId) =>
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

test('fewer than three observations only extends the baseline', () => {
  const current = report('3', [scenario('Perps add funds', 1000)]);
  const baseline = [
    report('1', [scenario('Perps add funds', 100)]),
    report('2', [scenario('Perps add funds', 100)]),
  ];

  const exception = buildScheduledException(current, baseline);

  assert.equal(MIN_BASELINE_RUNS, 3);
  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
});
