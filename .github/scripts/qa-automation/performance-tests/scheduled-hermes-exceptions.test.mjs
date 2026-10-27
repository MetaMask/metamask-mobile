/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_CANDIDATE_RUNS,
  BASELINE_PREVIOUS_RUNS,
  MIN_BASELINE_RUNS,
  buildIssueVerdictDm,
  buildPerformanceChannelSlack,
  buildScheduledException,
  buildScheduledExceptionMarkdown,
  buildScheduledExceptionSlack,
  selectBaselineReports,
} from './scheduled-hermes-exceptions.mjs';

const PERPS = 'Perps add funds';
const MONEY = 'Money Home after importing SRP with funded balance';

function scenario(
  name,
  jsWorkMs,
  { projectName = 'browserstack-android', segmentCount = 2 } = {},
) {
  return { projectName, scenario: name, jsWorkMs, segmentCount };
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

/** One report per value, oldest id first, for a single scenario. */
function baselineOf(values, name = PERPS, options) {
  return values.map((jsWorkMs, index) =>
    report(String(index + 1), [scenario(name, jsWorkMs, options)]),
  );
}

/** Six steady runs of several scenarios. */
function steadyBaseline(entries, count = BASELINE_PREVIOUS_RUNS) {
  return Array.from({ length: count }, (_, index) =>
    report(
      String(index + 1),
      entries.map(([name, jsWorkMs]) => scenario(name, jsWorkMs)),
    ),
  );
}

const STEADY = [100, 110, 120, 100, 110, 120];

/** A run over the threshold in both the current and the previous tick. */
function confirmedFinding(current = 165, previous = 165) {
  return buildScheduledException(
    report('8', [scenario(PERPS, current)]),
    baselineOf(STEADY),
    { previousReport: report('7', [scenario(PERPS, previous)]) },
  );
}

test('selectBaselineReports keeps the six most recent scheduled ticks', () => {
  const ids = [10, 20, 30, 40, 50, 60, 70];
  const collected = new Map(
    ids.map((id) => [String(id), report(String(id), [scenario(PERPS, 100)])]),
  );
  const selected = selectBaselineReports(
    ids.map((databaseId) => ({ databaseId })),
    collected,
  );

  assert.equal(BASELINE_PREVIOUS_RUNS, 6);
  assert.deepEqual(
    selected.map((entry) => entry.meta.runId),
    ['10', '20', '30', '40', '50', '60'],
  );
});

test('selectBaselineReports replaces a missing tick with the next older one, within a bound', () => {
  const ids = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const missing = new Set([20, 40]);
  const collected = new Map(
    ids
      .filter((id) => !missing.has(id))
      .map((id) => [String(id), report(String(id), [scenario(PERPS, 100)])]),
  );
  const selected = selectBaselineReports(
    ids.map((databaseId) => ({ databaseId })),
    collected,
  );

  assert.equal(BASELINE_CANDIDATE_RUNS, 8);
  assert.deepEqual(
    selected.map((entry) => entry.meta.runId),
    ['10', '30', '50', '60', '70', '80'],
  );

  const sparse = new Map([['10', report('10', [scenario(PERPS, 100)])]]);
  assert.equal(
    selectBaselineReports(
      ids.map((databaseId) => ({ databaseId })),
      sparse,
    ).length,
    1,
  );
});

test('a run below the recent threshold reports an all-clear', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 140)]),
    baselineOf(STEADY),
  );
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
  assert.deepEqual(exception.pending, []);
  assert.match(slack, /nothing to action/);
  assert.match(slack, /_Checked:_ 1\/1 scenarios/);
  assert.match(slack, /up to the previous 6 clean scheduled runs/);
  assert.match(slack, /no scenario is confirmed over 1\.5× its recent average/);
  assert.doesNotMatch(slack, /_Pending:_/);
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /An all-clear was posted/,
  );
});

test('an all-clear names the scenarios that have no clean baseline yet', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 140), scenario(MONEY, 900)]),
    baselineOf(STEADY),
  );

  const slack = buildScheduledExceptionSlack(exception);

  assert.match(slack, /_Checked:_ 1\/2 scenarios/);
  assert.match(slack, /1 without 4 clean baseline runs yet/);
});

test('a finding DM carries the verdict and does not claim an issue was opened', () => {
  const exception = confirmedFinding();
  const message = buildIssueVerdictDm(
    exception,
    'Look at the perps deposit frame.',
  );

  assert.match(message, /Possible regression/);
  assert.match(message, /no issue was opened/);
  assert.match(message, /AI proposal/);
  assert.match(message, /Look at the perps deposit frame/);
  const clear = buildScheduledException(
    report('8', [scenario(PERPS, 140)]),
    baselineOf(STEADY),
  );
  assert.equal(buildIssueVerdictDm(clear), '');
});

test('a scenario at 1.5 times the recent average becomes a finding when the previous run was also over', () => {
  const exception = confirmedFinding();
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, true);
  assert.equal(exception.findings[0].baselineMedianJsWorkMs, 110);
  assert.equal(exception.findings[0].baselineRuns, 6);
  assert.equal(exception.findings[0].ratio, 1.5);
  assert.deepEqual(exception.pending, []);
  assert.match(slack, /Possible regression/);
  assert.match(slack, /average of up to the previous 6 clean scheduled runs/);
  assert.match(slack, /owner mm-perps-engineering-team/);
  assert.doesNotMatch(slack, /subteam|<!/);
});

test('a single run over the threshold is pending until the next run confirms it', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 200)]),
    baselineOf(STEADY),
    { previousReport: report('7', [scenario(PERPS, 115)]) },
  );
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
  assert.equal(exception.pending.length, 1);
  assert.equal(exception.pending[0].scenario, PERPS);
  assert.equal(exception.meta.pendingConfirmationCount, 1);
  assert.match(slack, /nothing to action/);
  assert.match(
    slack,
    /_Pending:_ 1 over 1\.5× once, awaiting confirmation by the next scheduled run: Perps add funds \(1\.82×\)/,
  );
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /Pending: 1 over 1\.5× once/,
  );
});

test('a scenario cannot be confirmed without a usable previous run', () => {
  const baseline = baselineOf(STEADY);
  const current = report('8', [scenario(PERPS, 200)]);

  const noPrevious = buildScheduledException(current, baseline);
  const missingScenario = buildScheduledException(current, baseline, {
    previousReport: report('7', [scenario(MONEY, 500)]),
  });
  const incompletePrevious = buildScheduledException(current, baseline, {
    previousReport: report('7', [scenario(PERPS, 200, { segmentCount: 1 })]),
  });

  for (const exception of [noPrevious, missingScenario, incompletePrevious]) {
    assert.deepEqual(exception.findings, []);
    assert.equal(exception.pending.length, 1);
  }
});

test('baseline runs that lost segments do not drag the average down', () => {
  const baseline = baselineOf([100, 100, 100, 100, 100, 100]).map(
    (entry, index) =>
      index >= 4
        ? report(entry.meta.runId, [scenario(PERPS, 30, { segmentCount: 1 })])
        : entry,
  );
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 140)]),
    baseline,
    { previousReport: report('7', [scenario(PERPS, 140)]) },
  );

  // Averaging all six would give 76.7 ms and a 1.82× false positive.
  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.pending, []);
  assert.equal(exception.meta.excludedIncompleteCount, 2);
  assert.equal(exception.meta.comparedScenarioCount, 1);
  assert.match(
    buildScheduledExceptionSlack(exception),
    /excluded 2 incomplete baseline observations/,
  );
});

test('a baseline run with no JS work is incomplete even without a segment count', () => {
  const baseline = [100, 100, 100, 100, 100, 0].map((jsWorkMs, index) =>
    report(String(index + 1), [
      { projectName: 'browserstack-android', scenario: PERPS, jsWorkMs },
    ]),
  );
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 140)]),
    baseline,
  );

  assert.equal(exception.meta.excludedIncompleteCount, 1);
  assert.equal(exception.meta.hasFindings, false);
});

test('reports from before segment counts were stored are judged by JS work alone', () => {
  const baseline = STEADY.map((jsWorkMs, index) =>
    report(String(index + 1), [
      { projectName: 'browserstack-android', scenario: PERPS, jsWorkMs },
    ]),
  );
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 165)]),
    baseline,
    { previousReport: report('7', [scenario(PERPS, 165)]) },
  );

  assert.equal(exception.meta.excludedIncompleteCount, 0);
  assert.equal(exception.findings.length, 1);
});

test('a spike in the baseline is excluded so it cannot hide a real regression', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 160)]),
    baselineOf([100, 100, 100, 100, 100, 400]),
    { previousReport: report('7', [scenario(PERPS, 160)]) },
  );

  // Averaging all six would give 150 ms and a 1.07× miss.
  assert.equal(exception.meta.excludedSpikeCount, 1);
  assert.equal(exception.findings.length, 1);
  assert.equal(exception.findings[0].baselineMedianJsWorkMs, 100);
  assert.equal(exception.findings[0].baselineRuns, 5);
  assert.equal(exception.findings[0].ratio, 1.6);
  assert.match(
    buildScheduledExceptionSlack(exception),
    /excluded 1 spiking baseline observations/,
  );
});

test('fewer than four clean observations only extends the baseline', () => {
  const exception = buildScheduledException(
    report('5', [scenario(PERPS, 1000)]),
    baselineOf([100, 100, 100]),
    { previousReport: report('4', [scenario(PERPS, 1000)]) },
  );

  assert.equal(MIN_BASELINE_RUNS, 4);
  assert.equal(exception.meta.comparedScenarioCount, 0);
  assert.equal(exception.meta.hasFindings, false);
  assert.deepEqual(exception.findings, []);
  assert.deepEqual(exception.pending, []);
});

test('filtering below four clean observations leaves the scenario unchecked', () => {
  const baseline = [
    scenario(PERPS, 100),
    scenario(PERPS, 100),
    scenario(PERPS, 100),
    scenario(PERPS, 30, { segmentCount: 1 }),
    scenario(PERPS, 30, { segmentCount: 1 }),
  ].map((entry, index) => report(String(index + 1), [entry]));
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 1000)]),
    baseline,
    { previousReport: report('7', [scenario(PERPS, 1000)]) },
  );

  assert.equal(exception.meta.comparedScenarioCount, 0);
  assert.deepEqual(exception.findings, []);
  assert.deepEqual(exception.pending, []);
});

test('two scenarios crossing together are each named in the digest', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 200), scenario(MONEY, 350)]),
    steadyBaseline([
      [PERPS, 100],
      [MONEY, 200],
    ]),
    {
      previousReport: report('7', [scenario(PERPS, 200), scenario(MONEY, 350)]),
    },
  );
  const slack = buildScheduledExceptionSlack(exception);

  assert.equal(exception.findings.length, 2);
  assert.match(slack, /2 scenarios\* each exceeded 1\.5×/);
  assert.doesNotMatch(slack, /tracked on its own bug/);
  assert.doesNotMatch(
    buildScheduledExceptionMarkdown(exception),
    /tracked on its own bug/,
  );
  assert.match(slack, /owner mm-perps-engineering-team/);
  assert.match(slack, /owner mm-earn-team/);

  for (const [index, number] of [600, 601].entries()) {
    exception.findings[index].issue = {
      number,
      url: `https://github.com/MetaMask/metamask-mobile/issues/${number}`,
      created: true,
    };
  }
  assert.match(
    buildScheduledExceptionSlack(exception),
    /tracked on its own bug/,
  );
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /tracked on its own bug/,
  );

  exception.findings[1].issue = { error: 'HTTP 403' };
  assert.doesNotMatch(
    buildScheduledExceptionSlack(exception),
    /tracked on its own bug/,
  );
  assert.doesNotMatch(
    buildScheduledExceptionMarkdown(exception),
    /tracked on its own bug/,
  );
});

test('a finding links the GitHub issue that tracks it', () => {
  const exception = confirmedFinding();

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

test('two newly opened bugs are each linked and mention their team', () => {
  const exception = buildScheduledException(
    report('8', [scenario(PERPS, 200), scenario(MONEY, 350)]),
    steadyBaseline([
      [PERPS, 100],
      [MONEY, 200],
    ]),
    {
      previousReport: report('7', [scenario(PERPS, 200), scenario(MONEY, 350)]),
    },
  );
  exception.findings[0].issue = {
    number: 600,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/600',
    created: true,
  };
  exception.findings[1].issue = {
    number: 601,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/601',
    created: true,
  };

  const slack = buildScheduledExceptionSlack(exception);
  const performance = buildPerformanceChannelSlack(exception);

  assert.match(slack, /#600> opened/);
  assert.match(slack, /#601> opened/);
  assert.doesNotMatch(slack, /subteam/);
  assert.match(performance, /\*App profiling: bugs opened for review\*/);
  assert.match(performance, /A bug is open for each owning team/);
  assert.match(
    performance,
    /<!subteam\^S094DMAQNCV\|mm-perps-engineering-team> · Bug: <https:\/\/github\.com\/MetaMask\/metamask-mobile\/issues\/600\|#600>/,
  );
  assert.match(
    performance,
    /<!subteam\^S052NJFKX6Y\|mm-earn-team> · Bug: <https:\/\/github\.com\/MetaMask\/metamask-mobile\/issues\/601\|#601>/,
  );
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /\[#600\]\(.*\/600\) opened/,
  );
  assert.match(
    buildScheduledExceptionMarkdown(exception),
    /\[#601\]\(.*\/601\) opened/,
  );
});

test('a team without a Slack group is named without a mention', () => {
  const name = 'Rewards tab time-to-content: onboarding or dashboard';
  const exception = buildScheduledException(
    report('8', [scenario(name, 300)]),
    steadyBaseline([[name, 100]]),
    { previousReport: report('7', [scenario(name, 300)]) },
  );
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
