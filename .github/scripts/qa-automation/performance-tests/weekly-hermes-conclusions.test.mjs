/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS,
  buildWeeklyScenarioCard,
  buildWeeklyMarkdown,
  buildWeeklyParentSlack,
  buildWeeklyReport,
  buildSharedFrameCard,
  classifyScenario,
  classifyWeeklyScenarios,
  collapseSharedNewFrames,
  collapseSharedSpikes,
  formatDurationsAlike,
  frameLabel,
  weeklySlackCards,
  isIsolatedSpike,
  isNewHotFrame,
  isRisingWithinWeek,
  isWorseThanLastWeek,
  hasRecoveredSinceSpike,
  utcMondayStart,
  weekBounds,
  lastWeekRunsMatchingThisWeekDays,
  matchingPreviousWeekdays,
  utcDateKey,
  utcDateKeysFromTimestamps,
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
    runsAfterPeak: 0,
    tailRuns: 2,
    tailMedianJsWorkMs: 2000,
    earlierMedianJsWorkMs: 2000,
    latestRunId: '11',
    latestRunUrl: 'https://example.com/11',
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

test('two days with data compare only those weekdays last week', () => {
  assert.equal(utcDateKey('2026-09-20T18:00:00.000Z'), '2026-09-20');
  assert.deepEqual(
    utcDateKeysFromTimestamps([
      '2026-09-20T18:00:00.000Z',
      '2026-09-19T06:00:00.000Z',
      '2026-09-20T00:00:00.000Z',
    ]),
    ['2026-09-19', '2026-09-20'],
  );
  assert.deepEqual(matchingPreviousWeekdays(['2026-09-19', '2026-09-20']), [
    '2026-09-12',
    '2026-09-13',
  ]);

  const thisWeekReports = [
    { meta: { createdAt: '2026-09-19T12:00:00.000Z' } },
    { meta: { createdAt: '2026-09-20T12:00:00.000Z' } },
  ];
  const lastWeekRuns = [
    { databaseId: 1, createdAt: '2026-09-08T12:00:00.000Z' },
    { databaseId: 12, createdAt: '2026-09-12T12:00:00.000Z' },
    { databaseId: 13, createdAt: '2026-09-13T12:00:00.000Z' },
    { databaseId: 14, createdAt: '2026-09-14T00:00:00.000Z' },
  ];

  const comparable = lastWeekRunsMatchingThisWeekDays(
    thisWeekReports,
    lastWeekRuns,
  );

  assert.deepEqual(comparable.thisWeekDays, ['2026-09-19', '2026-09-20']);
  assert.deepEqual(comparable.lastWeekDays, ['2026-09-12', '2026-09-13']);
  assert.deepEqual(
    comparable.runs.map((run) => run.databaseId),
    [12, 13],
  );
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

test('a spike the scenario has run clean past is not a finding', () => {
  const current = scenarioFixture('Perps add funds', {
    medianJsWorkMs: 2000,
    maxJsWorkMs: 4000,
    spikeRatio: 2,
    // Four runs came after the peak and the newest two sit on the median.
    runsAfterPeak: 4,
    tailMedianJsWorkMs: 2050,
    earlierMedianJsWorkMs: 2000,
  });

  assert.equal(hasRecoveredSinceSpike(current), true);
  assert.equal(isRisingWithinWeek(current), false);
  assert.equal(classifyScenario(current, null), STATUS.RECOVERED);

  const report = buildWeeklyReport({
    thisWindow: {
      meta: { profileCount: 9, symbolicatedProfileCount: 9 },
      scenarios: [current],
    },
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 9,
    lastWeekRunCount: 0,
  });

  assert.deepEqual(report.cards, []);
  assert.equal(report.recovered.length, 1);
  assert.equal(report.recovered[0].runsAfterPeak, 4);
  const parent = buildWeeklyParentSlack(report);
  assert.match(parent, /\*Nothing to action this week\.\*/);
  assert.match(parent, /_Recovered, not reported as findings:_ Perps add funds/);
  assert.match(parent, /back on the median since/);
});

test('a spike in the newest run is still reported', () => {
  const current = scenarioFixture('Perps add funds', {
    medianJsWorkMs: 2000,
    maxJsWorkMs: 4000,
    spikeRatio: 2,
    runsAfterPeak: 0,
    // Above the median but not a sustained rise against the earlier runs.
    tailMedianJsWorkMs: 2400,
    earlierMedianJsWorkMs: 2000,
  });

  assert.equal(hasRecoveredSinceSpike(current), false);
  assert.equal(isRisingWithinWeek(current), false);
  assert.equal(classifyScenario(current, null), STATUS.SPIKE);
  assert.match(
    buildWeeklyScenarioCard(
      classifyWeeklyScenarios({ scenarios: [current] }, { scenarios: [] })[0],
    ),
    /newest run of the week is the peak/,
  );
});

test('the newest runs sitting above the earlier ones is a rising trend', () => {
  const current = scenarioFixture('Perps add funds', {
    medianJsWorkMs: 2200,
    maxJsWorkMs: 4000,
    spikeRatio: 1.82,
    runsAfterPeak: 0,
    tailRuns: 2,
    tailMedianJsWorkMs: 3900,
    earlierMedianJsWorkMs: 2000,
  });

  assert.equal(isRisingWithinWeek(current), true);
  assert.equal(classifyScenario(current, null), STATUS.RISING);

  const [card] = classifyWeeklyScenarios(
    { scenarios: [current] },
    { scenarios: [] },
  );
  const rendered = buildWeeklyScenarioCard(card);
  assert.match(rendered, /\*Rising within the week\*/);
  assert.match(
    rendered,
    /last 2 runs of the week sit at 3900\.0 ms against 2000\.0 ms/,
  );
  assert.match(rendered, /check what landed mid-week/);
});

function predictFeedContributor() {
  return {
    name: 'usePredictFeed',
    url: 'app/predict.ts',
    line: 4,
    runsHot: 9,
    medianSelfMs: 500,
    medianSharePct: 14,
  };
}

test('new hot frame requires symbolicated identities to change and JS work to rise', () => {
  const current = scenarioFixture('Predict Deposit - Complete Flow Performance', {
    medianJsWorkMs: 2300,
    contributors: [predictFeedContributor()],
  });
  const previous = scenarioFixture('Predict Deposit - Complete Flow Performance');

  assert.equal(isNewHotFrame(current, previous), true);
  assert.equal(classifyScenario(current, previous), STATUS.NEW_FRAME);

  const [card] = classifyWeeklyScenarios(
    { scenarios: [current] },
    { scenarios: [previous] },
  );
  assert.match(card.conclusion, /`selectAccount` \(app\/foo\.ts:10\)/);
  assert.match(card.conclusion, /`usePredictFeed` \(app\/predict\.ts:4\)/);
  assert.match(card.conclusion, /rose 1\.15× versus last week/);
});

test('a new top frame in a scenario that got faster is not a finding', () => {
  // The Sep 28 thread: `fast-equals` took the lead in 13 scenarios whose
  // median JS work went down 0.65×–0.98×. That is a profile shape change.
  const current = scenarioFixture('Perps add funds', {
    medianJsWorkMs: 1900,
    contributors: [predictFeedContributor()],
  });
  const previous = scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 });

  assert.equal(isNewHotFrame(current, previous), false);
  assert.equal(classifyScenario(current, previous), null);
});

test('frameLabel tells two anonymous frames apart by file and line', () => {
  assert.equal(
    frameLabel({ name: 'anonymous', url: 'app/lib/snaps/preinstalled-snaps.ts', line: 39 }),
    '`anonymous` (app/lib/snaps/preinstalled-snaps.ts:39)',
  );
  assert.equal(frameLabel({ name: 'objectKeys' }), '`objectKeys`');
  assert.equal(frameLabel(null), '');
});

function sharedFrameWindow(names, medianJsWorkMs) {
  return {
    meta: { profileCount: 20, symbolicatedProfileCount: 20 },
    scenarios: names.map((name) =>
      scenarioFixture(name, {
        medianJsWorkMs,
        contributors: [
          {
            name: 'isPropertyEqual',
            url: 'node_modules/fast-equals/dist/cjs/index.cjs',
            line: 281,
            runsHot: 12,
            medianSelfMs: 2000,
            medianSharePct: 8.8,
          },
        ],
      }),
    ),
  };
}

test('one frame leading several slower scenarios is one card, not one per scenario', () => {
  const names = [
    'Perps add funds',
    'Asset View',
    'Cold Start: Measure ColdStart To Login Screen',
  ];
  const report = buildWeeklyReport({
    thisWindow: sharedFrameWindow(names, 2300),
    lastWindow: {
      meta: {},
      scenarios: names.map((name) => scenarioFixture(name)),
    },
    bounds: weekBounds(new Date('2026-09-28T09:00:00.000Z')),
    thisWeekRunCount: 19,
    lastWeekRunCount: 13,
  });

  assert.equal(report.cards.length, 0);
  assert.equal(report.sharedFrames.length, 1);
  assert.equal(report.sharedFrames[0].name, 'isPropertyEqual');
  assert.equal(report.sharedFrames[0].scenarios.length, 3);

  const cards = weeklySlackCards(report);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /\*New hot frame across 3 scenarios\*/);
  assert.match(cards[0], /`isPropertyEqual` \(node_modules\/fast-equals\/dist\/cjs\/index\.cjs:281\)/);
  assert.match(cards[0], /not 3 regressions/);
  assert.match(cards[0], /Perps add funds\* — 2000\.0 ms → 2300\.0 ms \(1\.15×\) · 8\.8%/);
  assert.match(cards[0], /was `selectAccount` \(app\/foo\.ts:10\)/);
  assert.match(cards[0], /owner mm-perps-engineering-team/);
  assert.match(cards[0], /owner assets-dev-team/);
  assert.doesNotMatch(cards[0], /subteam/);

  const parent = buildWeeklyParentSlack(report);
  assert.doesNotMatch(parent, /Nothing to action this week/);
  assert.match(parent, /_Shared hot frame:_ `isPropertyEqual`/);
  assert.match(parent, /became the top frame in 3 scenarios that got slower/);
  assert.match(parent, /reported once instead of per scenario/);
  assert.match(parent, /traces back to one shared frame or one run/);

  const markdown = buildWeeklyMarkdown(report);
  assert.match(markdown, /## New hot frame across 3 scenarios — `isPropertyEqual`/);
  assert.match(markdown, /- Asset View — median JS work 2000\.0 ms → 2300\.0 ms \(1\.15×\)/);
});

test('a frame that leads only one slower scenario stays a per-scenario card', () => {
  const cards = classifyWeeklyScenarios(
    sharedFrameWindow(['Perps add funds'], 2300),
    { scenarios: [scenarioFixture('Perps add funds')] },
  );

  const collapsed = collapseSharedNewFrames(cards);

  assert.equal(collapsed.sharedFrames.length, 0);
  assert.deepEqual(
    collapsed.cards.map((card) => card.status),
    [STATUS.NEW_FRAME],
  );
});

test('different new frames in different scenarios are not collapsed together', () => {
  const current = {
    scenarios: [
      scenarioFixture('Perps add funds', {
        medianJsWorkMs: 2300,
        contributors: [predictFeedContributor()],
      }),
      scenarioFixture('Asset View', {
        medianJsWorkMs: 2300,
        contributors: [
          { ...predictFeedContributor(), name: 'useAssets', url: 'app/assets.ts' },
        ],
      }),
    ],
  };
  const previous = {
    scenarios: [
      scenarioFixture('Perps add funds'),
      scenarioFixture('Asset View'),
    ],
  };

  const collapsed = collapseSharedNewFrames(
    classifyWeeklyScenarios(current, previous),
  );

  assert.equal(collapsed.sharedFrames.length, 0);
  assert.equal(collapsed.cards.length, 2);
});

test('buildSharedFrameCard scales every row to the same unit', () => {
  const card = buildSharedFrameCard({
    name: 'comparator',
    url: 'node_modules/fast-equals/dist/cjs/index.cjs',
    line: 317,
    scenarios: [
      {
        scenario: 'Swap flow - ETH to LINK',
        previousFrame: '`mod` (node_modules/@noble/curves/abstract/modular.js:33)',
        medianJsWorkMs: 26_500,
        previousMedianJsWorkMs: 24_100,
        ratio: 1.1,
        medianSharePct: 8,
      },
      {
        scenario: 'Fresh SRP wallet creation performance',
        previousFrame: '`mod` (node_modules/@noble/curves/abstract/modular.js:33)',
        medianJsWorkMs: 9_800,
        previousMedianJsWorkMs: 8_900,
        ratio: 1.1,
        medianSharePct: 5,
      },
    ],
  });

  assert.match(card, /24\.1 s → 26\.5 s \(1\.1×\)/);
  assert.match(card, /8\.9 s → 9\.8 s \(1\.1×\)/);
  assert.doesNotMatch(card, / ms /);
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

  assert.match(empty, /Nothing to action this week/);
  assert.match(empty, /No Hermes JS regressions were detected versus the previous week/);
  assert.doesNotMatch(empty, /Healthy Start/);
  assert.doesNotMatch(empty, /production alert/);

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

  assert.match(withCards, /_Scenario findings:_ 1 worse than last week/);
  assert.match(withCards, /Stable scenarios omitted/);
});

test('a card without a previous week says so instead of printing n/a', () => {
  const [card] = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Perps add funds', {
          medianJsWorkMs: 2000,
          maxJsWorkMs: 4000,
          spikeRatio: 2,
        }),
      ],
    },
    { scenarios: [] },
  );

  const rendered = buildWeeklyScenarioCard(card);

  assert.match(rendered, /no comparable run in the previous week/);
  assert.doesNotMatch(rendered, /n\/a/);
});

function spikeWindow(names, peakRunId, overrides = {}) {
  return {
    meta: { profileCount: 10, symbolicatedProfileCount: 10 },
    scenarios: names.map((name) =>
      scenarioFixture(name, {
        medianJsWorkMs: 2000,
        maxJsWorkMs: 4000,
        spikeRatio: 2,
        peakRunId,
        peakRunUrl: `https://example.com/${peakRunId}`,
        ...overrides,
      }),
    ),
  };
}

test('one slow run is reported once, not as a regression per scenario', () => {
  const report = buildWeeklyReport({
    thisWindow: spikeWindow(
      ['Perps add funds', 'Money Home', 'Asset View', 'Cold Start Login'],
      '34935384411',
    ),
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 9,
    lastWeekRunCount: 0,
    thisWeekRunsAvailable: 22,
    lastWeekRunsAvailable: 24,
  });

  assert.equal(report.cards.length, 0);
  assert.equal(report.sharedSpikes.length, 1);
  assert.equal(report.sharedSpikes[0].runId, '34935384411');
  assert.equal(report.sharedSpikes[0].scenarios.length, 4);

  const parent = buildWeeklyParentSlack(report);
  assert.match(parent, /was the peak of 4 scenarios/);
  // Counting zero of everything above real findings read as "nothing found".
  assert.doesNotMatch(parent, /0 isolated spike/);
  assert.match(parent, /No scenario regressed on its own this week/);
  assert.doesNotMatch(parent, /Nothing to action this week/);
  // With nothing analyzable from the previous week, no card may claim a trend.
  assert.match(parent, /nothing here is a week-over-week comparison yet/);

  const cards = weeklySlackCards(report);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /\*Slow run\*/);
  assert.match(cards[0], /Owners are named for routing/);
  assert.match(cards[0], /owner mm-perps-engineering-team/);
  assert.match(cards[0], /owner mm-earn-team/);
  assert.doesNotMatch(cards[0], /subteam/);
  // A bare duration reads as the test's wall clock, which this is not.
  assert.match(
    cards[0],
    /JS work 4000\.0 ms in that run vs 2000\.0 ms weekly median/,
  );
  assert.match(cards[0], /not test duration/);
  assert.match(parent, /JS self time attributed from those samples/);
});

test('a comparison is not printed in two different units', () => {
  const [card] = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Warm Start', {
          medianJsWorkMs: 3782,
          minJsWorkMs: 3000,
          maxJsWorkMs: 15_600,
          spikeRatio: 4.13,
        }),
      ],
    },
    { scenarios: [] },
  );

  const rendered = buildWeeklyScenarioCard(card);

  assert.match(rendered, /median JS work 3\.8 s \(3\.0 s – 15\.6 s\)/);
  assert.doesNotMatch(rendered, / ms.* s[ )]/);
  assert.deepEqual(formatDurationsAlike([15_600, 3782]), [
    '15.6 s',
    '3.8 s',
  ]);
  assert.deepEqual(formatDurationsAlike([400, 120]), ['400.0 ms', '120.0 ms']);
});

test('the markdown record scales this week and last week alike', () => {
  const markdown = buildWeeklyMarkdown(
    buildWeeklyReport({
      thisWindow: {
        meta: { profileCount: 20, symbolicatedProfileCount: 18 },
        scenarios: [
          scenarioFixture('Perps add funds', {
            medianJsWorkMs: 15_600,
            minJsWorkMs: 12_000,
            maxJsWorkMs: 18_000,
          }),
        ],
      },
      lastWindow: {
        meta: {},
        scenarios: [
          scenarioFixture('Perps add funds', { medianJsWorkMs: 3782 }),
        ],
      },
      bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
      thisWeekRunCount: 20,
      lastWeekRunCount: 19,
    }),
  );

  assert.match(markdown, /Last week median JS work: 3\.8 s → 15\.6 s this week/);
  assert.doesNotMatch(markdown, /3782\.0 ms/);
});

test('a slow run every scenario has run clean past is marked recovered', () => {
  const report = buildWeeklyReport({
    thisWindow: spikeWindow(
      ['Perps add funds', 'Money Home', 'Asset View'],
      '34935384411',
      { runsAfterPeak: 5, tailMedianJsWorkMs: 2000 },
    ),
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 9,
    lastWeekRunCount: 0,
  });

  // The bad run is still named once, but as history and not as pending work.
  assert.equal(report.cards.length, 0);
  assert.equal(report.sharedSpikes.length, 1);
  assert.equal(report.sharedSpikes[0].recovered, true);
  assert.deepEqual(report.recovered, []);

  // History is not something to read in the thread; the parent line and the
  // markdown record carry it.
  assert.deepEqual(weeklySlackCards(report), []);
  const parent = buildWeeklyParentSlack(report);
  assert.match(parent, /\*Nothing to action this week\.\*/);
  assert.match(parent, /every one of them has run clean since/);
  assert.match(parent, /nothing is posted in the thread/);
  assert.doesNotMatch(parent, /detailed in the thread/);
  assert.doesNotMatch(parent, /One card per finding/);
});

test('a recovered slow run next to real findings gets no card either', () => {
  const report = buildWeeklyReport({
    thisWindow: {
      meta: { profileCount: 10, symbolicatedProfileCount: 10 },
      scenarios: [
        ...spikeWindow(['Money Home', 'Asset View'], '35936933013', {
          runsAfterPeak: 5,
          tailMedianJsWorkMs: 2000,
        }).scenarios,
        scenarioFixture('Perps add funds', { medianJsWorkMs: 5000 }),
      ],
    },
    lastWindow: {
      meta: {},
      scenarios: [scenarioFixture('Perps add funds', { medianJsWorkMs: 2000 })],
    },
    bounds: weekBounds(new Date('2026-09-28T09:00:00.000Z')),
    thisWeekRunCount: 19,
    lastWeekRunCount: 13,
  });

  const cards = weeklySlackCards(report);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /\*Worse than last week\* · \*Perps add funds\*/);
  assert.doesNotMatch(cards.join('\n'), /Slow run \(recovered\)/);

  const parent = buildWeeklyParentSlack(report);
  assert.match(parent, /_Slow run:_ <https:\/\/example\.com\/35936933013\|35936933013>/);
  assert.match(parent, /has run clean since and it gets no card/);
  // The markdown record still keeps it.
  assert.match(buildWeeklyMarkdown(report), /## Slow run \(recovered\) — \[35936933013\]/);
});

test('an open slow run still gets its card', () => {
  const report = buildWeeklyReport({
    thisWindow: spikeWindow(['Perps add funds', 'Money Home'], '34935384411'),
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 9,
    lastWeekRunCount: 0,
  });

  const cards = weeklySlackCards(report);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /^\*Slow run\* · /);
  assert.doesNotMatch(cards[0], /recovered/);
});

test('every row of a slow run card is scaled to the same unit', () => {
  const report = buildWeeklyReport({
    thisWindow: {
      meta: { profileCount: 10, symbolicatedProfileCount: 10 },
      scenarios: [
        scenarioFixture('Seedless Onboarding: Telegram Login New User', {
          medianJsWorkMs: 3782,
          maxJsWorkMs: 15_600,
          spikeRatio: 4.13,
          peakRunId: '34935384411',
          peakRunUrl: 'https://example.com/34935384411',
        }),
        // On its own this pair is under 10 s and would render in ms, which
        // put `8199.9 ms` between two rows counted in seconds.
        scenarioFixture('Seedless Onboarding: Apple Login New User', {
          medianJsWorkMs: 3113.7,
          maxJsWorkMs: 8199.9,
          spikeRatio: 2.63,
          peakRunId: '34935384411',
          peakRunUrl: 'https://example.com/34935384411',
        }),
        scenarioFixture('Fresh SRP wallet creation performance', {
          medianJsWorkMs: 11_300,
          maxJsWorkMs: 18_900,
          spikeRatio: 1.68,
          peakRunId: '34935384411',
          peakRunUrl: 'https://example.com/34935384411',
        }),
      ],
    },
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 17,
    lastWeekRunCount: 0,
  });

  const [card] = weeklySlackCards(report);

  assert.match(card, /JS work 15\.6 s in that run vs 3\.8 s weekly median/);
  assert.match(card, /JS work 8\.2 s in that run vs 3\.1 s weekly median/);
  assert.match(card, /JS work 18\.9 s in that run vs 11\.3 s weekly median/);
  assert.doesNotMatch(card, / ms /);
});

test('the markdown record keeps a recovered slow run', () => {
  const report = buildWeeklyReport({
    thisWindow: spikeWindow(
      ['Perps add funds', 'Money Home', 'Asset View'],
      '34935384411',
      { runsAfterPeak: 5, tailMedianJsWorkMs: 2000 },
    ),
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 9,
    lastWeekRunCount: 0,
  });

  const markdown = buildWeeklyMarkdown(report);

  // Slack keeps this run "for the record", so the record has to carry it.
  assert.match(markdown, /Nothing to action this week\./);
  assert.match(markdown, /## Slow run \(recovered\) — \[34935384411\]/);
  assert.match(markdown, /Perps add funds — JS work 4000\.0 ms in that run/);
  assert.match(markdown, /history, not pending work/);
  assert.doesNotMatch(
    markdown,
    /No Hermes JS regressions were detected versus the previous week/,
  );
});

test('the markdown record lists recovered scenarios and stays short when clean', () => {
  const recoveredOnly = buildWeeklyMarkdown(
    buildWeeklyReport({
      thisWindow: {
        meta: { profileCount: 9, symbolicatedProfileCount: 9 },
        scenarios: [
          scenarioFixture('Measure Warm Start: Login To Wallet Screen', {
            maxJsWorkMs: 4000,
            spikeRatio: 1.88,
            runsAfterPeak: 14,
            tailMedianJsWorkMs: 2000,
          }),
        ],
      },
      lastWindow: { meta: {}, scenarios: [] },
      bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
      thisWeekRunCount: 17,
      lastWeekRunCount: 0,
    }),
  );

  assert.match(recoveredOnly, /## Recovered, not reported as findings/);
  assert.match(
    recoveredOnly,
    /Measure Warm Start: Login To Wallet Screen \(1\.88×, 14 runs ago\)/,
  );

  const clean = buildWeeklyMarkdown(
    buildWeeklyReport({
      thisWindow: {
        meta: { profileCount: 20, symbolicatedProfileCount: 20 },
        scenarios: [scenarioFixture('Healthy Start')],
      },
      lastWindow: { meta: {}, scenarios: [scenarioFixture('Healthy Start')] },
      bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
      thisWeekRunCount: 20,
      lastWeekRunCount: 19,
    }),
  );

  assert.match(clean, /Nothing to action this week\./);
  assert.match(
    clean,
    /No Hermes JS regressions were detected versus the previous week/,
  );
  assert.doesNotMatch(clean, /Slow run/);
});

test('two scenarios peaking on the same run are one slow run', () => {
  const cards = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Account creation after fresh install', {
          maxJsWorkMs: 4000,
          spikeRatio: 1.94,
          peakRunId: '34878474622',
        }),
        scenarioFixture('Seedless Onboarding: Google Login New User', {
          maxJsWorkMs: 4000,
          spikeRatio: 3.44,
          peakRunId: '34878474622',
        }),
      ],
    },
    { scenarios: [] },
  );

  const collapsed = collapseSharedSpikes(cards);

  assert.equal(collapsed.cards.length, 0);
  assert.equal(collapsed.sharedSpikes.length, 1);
  assert.equal(collapsed.sharedSpikes[0].scenarios.length, 2);
});

test('a lone scenario spiking on its own run keeps its owner', () => {
  const cards = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Perps add funds', {
          maxJsWorkMs: 4000,
          spikeRatio: 2,
          peakRunId: 'run-a',
        }),
        scenarioFixture('Money Home', { spikeRatio: 1.1 }),
      ],
    },
    { scenarios: [] },
  );

  const collapsed = collapseSharedSpikes(cards);

  assert.equal(collapsed.sharedSpikes.length, 0);
  assert.deepEqual(
    collapsed.cards.map((card) => card.scenario),
    ['Perps add funds'],
  );
  assert.match(
    buildWeeklyScenarioCard(collapsed.cards[0]),
    /owner mm-perps-engineering-team/,
  );
  assert.doesNotMatch(
    buildWeeklyScenarioCard(collapsed.cards[0]),
    /subteam/,
  );
});

test('spikes on different runs stay per scenario', () => {
  const cards = classifyWeeklyScenarios(
    {
      scenarios: [
        scenarioFixture('Perps add funds', {
          maxJsWorkMs: 4000,
          spikeRatio: 2,
          peakRunId: 'run-a',
        }),
        scenarioFixture('Money Home', {
          maxJsWorkMs: 4000,
          spikeRatio: 2,
          peakRunId: 'run-b',
        }),
      ],
    },
    { scenarios: [] },
  );

  const collapsed = collapseSharedSpikes(cards);

  assert.equal(collapsed.sharedSpikes.length, 0);
  assert.equal(collapsed.cards.length, 2);
});

test('weekly Slack names the days that actually had profiles', () => {
  const report = buildWeeklyReport({
    thisWindow: { meta: { profileCount: 4, symbolicatedProfileCount: 4 }, scenarios: [] },
    lastWindow: { meta: {}, scenarios: [] },
    bounds: weekBounds(new Date('2026-09-21T09:00:00.000Z')),
    thisWeekRunCount: 4,
    lastWeekRunCount: 3,
    thisWeekRunsAvailable: 4,
    lastWeekRunsAvailable: 3,
    thisWeekDays: ['2026-09-19', '2026-09-20'],
    lastWeekDays: ['2026-09-12', '2026-09-13'],
  });

  const parent = buildWeeklyParentSlack(report);
  assert.match(
    parent,
    /_Days with data:_ 2026-09-19, 2026-09-20 \(same weekdays last week: 2026-09-12, 2026-09-13\)/,
  );
  assert.equal(report.meta.comparable, true);
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
