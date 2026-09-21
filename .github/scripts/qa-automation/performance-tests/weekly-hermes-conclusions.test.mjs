/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS,
  buildWeeklyParentSlack,
  buildWeeklyReport,
  classifyScenario,
  classifyWeeklyScenarios,
  isIsolatedSpike,
  isNewHotFrame,
  isWorseThanLastWeek,
  utcMondayStart,
  weekBounds,
} from './weekly-hermes-conclusions.mjs';

function scenarioFixture(name, overrides = {}) {
  return {
    projectName: 'browserstack-android',
    scenario: name,
    runsObserved: 10,
    runsTotal: 12,
    medianJsWorkMs: 2000,
    minJsWorkMs: 1500,
    maxJsWorkMs: 2200,
    medianJsDutyPct: 30,
    spikeRatio: 1.1,
    peakRunId: '11',
    peakRunUrl: 'https://example.com/11',
    hasDominantFrame: true,
    contributors: [
      {
        name: 'selectAccount',
        url: 'app/foo.ts',
        line: 10,
        runsHot: 8,
        medianSelfMs: 400,
        medianSharePct: 12,
      },
    ],
    ...overrides,
  };
}

test('weekBounds uses completed UTC weeks ending this Monday 00:00', () => {
  const bounds = weekBounds(new Date('2026-09-21T09:00:00.000Z'));

  assert.equal(utcMondayStart(new Date('2026-09-21T09:00:00.000Z')).toISOString(), '2026-09-21T00:00:00.000Z');
  assert.equal(bounds.thisWeek.since, '2026-09-14T00:00:00.000Z');
  assert.equal(bounds.thisWeek.until, '2026-09-21T00:00:00.000Z');
  assert.equal(bounds.lastWeek.since, '2026-09-07T00:00:00.000Z');
  assert.equal(bounds.lastWeek.until, '2026-09-14T00:00:00.000Z');
});

test('stable scenarios are not classified', () => {
  const current = scenarioFixture('Perps add funds');
  const previous = scenarioFixture('Perps add funds', { medianJsWorkMs: 1950 });

  assert.equal(classifyScenario(current, previous), null);
  assert.equal(isWorseThanLastWeek(current, previous), false);
});

test('worse than last week when median JS work jumps 1.5x', () => {
  const current = scenarioFixture('Perps add funds', { medianJsWorkMs: 4500 });
  const previous = scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 });

  assert.equal(classifyScenario(current, previous), STATUS.WORSE);
});

test('worse than last week when the same symbolicated frame rises 10%', () => {
  const current = scenarioFixture('Perps add funds', { medianJsWorkMs: 2300 });
  const previous = scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 });

  assert.equal(isWorseThanLastWeek(current, previous), true);
  assert.equal(classifyScenario(current, previous), STATUS.WORSE);
});

test('isolated spike is not a trend when the median is stable', () => {
  const current = scenarioFixture('Swap flow - ETH to LINK', {
    medianJsWorkMs: 2000,
    maxJsWorkMs: 4000,
    spikeRatio: 2,
  });
  const previous = scenarioFixture('Swap flow - ETH to LINK', {
    medianJsWorkMs: 1980,
  });

  assert.equal(isIsolatedSpike(current), true);
  assert.equal(classifyScenario(current, previous), STATUS.SPIKE);
});

test('new hot frame requires symbolicated identities to change', () => {
  const current = scenarioFixture('Predict Deposit - Complete Flow Performance', {
    contributors: [
      {
        name: 'usePredictFeed',
        url: 'app/predict.ts',
        line: 4,
        runsHot: 9,
        medianSelfMs: 500,
        medianSharePct: 14,
      },
    ],
  });
  const previous = scenarioFixture('Predict Deposit - Complete Flow Performance');

  assert.equal(isNewHotFrame(current, previous), true);
  assert.equal(classifyScenario(current, previous), STATUS.NEW_FRAME);
});

test('thin coverage that would be a regression is insufficient data', () => {
  const current = scenarioFixture('Perps add funds', {
    runsObserved: 2,
    medianJsWorkMs: 5000,
  });
  const previous = scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 });

  assert.equal(classifyScenario(current, previous), STATUS.INSUFFICIENT);
});

test('classifyWeeklyScenarios omits healthy cards and orders regressions first', () => {
  const cards = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Healthy Start'),
        scenarioFixture('Perps add funds', { medianJsWorkMs: 5000 }),
        scenarioFixture('Swap flow - ETH to LINK', {
          medianJsWorkMs: 2000,
          maxJsWorkMs: 4000,
          spikeRatio: 2,
        }),
      ],
    },
    {
      scenarios: [
        scenarioFixture('Healthy Start'),
        scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 }),
        scenarioFixture('Swap flow - ETH to LINK', { medianJsWorkMs: 1980 }),
      ],
    },
  );

  assert.deepEqual(
    cards.map((card) => [card.status, card.scenario]),
    [
      [STATUS.WORSE, 'Perps add funds'],
      [STATUS.SPIKE, 'Swap flow - ETH to LINK'],
    ],
  );
});

test('weekly Slack parent is an exception report', () => {
  const empty = buildWeeklyParentSlack(
    buildWeeklyReport({
      thisWindow: { meta: { profileCount: 20, symbolicatedProfileCount: 20 }, scenarios: [] },
      lastWindow: { meta: {}, scenarios: [] },
      bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
      thisWeekRunCount: 20,
      lastWeekRunCount: 19,
    }),
  );

  assert.match(empty, /No Hermes JS regressions were detected versus the previous week/);
  assert.match(empty, /testing experiment/);
  assert.doesNotMatch(empty, /Healthy Start/);

  const withCards = buildWeeklyParentSlack(
    buildWeeklyReport({
      thisWindow: {
        meta: { profileCount: 20, symbolicatedProfileCount: 18 },
        scenarios: [scenarioFixture('Perps add funds', { medianJsWorkMs: 5000 })],
      },
      lastWindow: {
        meta: {},
        scenarios: [scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 })],
      },
      bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
      thisWeekRunCount: 20,
      lastWeekRunCount: 19,
    }),
  );

  assert.match(withCards, /1 worse than last week/);
  assert.match(withCards, /Stable scenarios omitted/);
});

test('weekly Slack states when medians come from sampled runs', () => {
  const report = buildWeeklyReport({
    thisWindow: { meta: { profileCount: 6, symbolicatedProfileCount: 6 }, scenarios: [] },
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 6,
    lastWeekRunCount: 6,
    thisWeekRunsAvailable: 22,
    lastWeekRunsAvailable: 24,
  });

  assert.equal(report.meta.sampled, true);
  assert.match(
    buildWeeklyParentSlack(report),
    /sampled 6\/22 and 6\/24 scheduled runs/,
  );
});
