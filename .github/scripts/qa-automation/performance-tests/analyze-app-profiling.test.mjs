/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  parseArgs,
  resolveLatestRun,
  resolveRunsInWindow,
  resolveRunsInRange,
  sampleRunsAcrossNewestDays,
  planWeeklyRuns,
  reportsForRuns,
  isReusableCollectedReport,
  findHermesProfiles,
  findAndroidSourcemaps,
  sourcemapVariant,
  profileSourcemapVariant,
  selectSourcemap,
  convertProfile,
  findSkillAnalyzer,
  runSkillAnalyzer,
  parseProfileFileName,
  summarizeHermesProfile,
  groupProfiles,
  buildAiBriefing,
  buildMarkdown,
  buildSlack,
  buildConclusions,
  writeScenarioArtifacts,
  median,
  scenarioFrameTotals,
  aggregateWindow,
  buildWindowMarkdown,
  buildWindowSlack,
} from './analyze-app-profiling.mjs';
import {
  collectHermesCpuProfiles,
  findHermesCpuProfileFiles,
} from '../../../../tests/scripts/aggregate-performance-reports.mjs';

function profile(fileName, overrides = {}) {
  const parsed = parseProfileFileName(fileName);
  return {
    ...parsed,
    skipped: false,
    sampleCount: 10,
    totalWeight: 10,
    durationMs: 100,
    topSelfFrames: [
      {
        name: 'renderAssets',
        category: 'JavaScript',
        samples: 6,
        sharePct: 60,
      },
    ],
    topInclusiveFrames: [],
    ...overrides,
  };
}

test('parseArgs supports weekly and collect-only modes', () => {
  const weekly = parseArgs(['--weekly', '--now', '2026-09-21T09:00:00.000Z']);
  assert.equal(weekly.weekly, true);
  assert.equal(weekly.skipAi, true);
  assert.equal(weekly.skipScenarioArtifacts, true);
  assert.equal(weekly.now, '2026-09-21T09:00:00.000Z');

  // Every run in the week is analyzed; only the rebuild time is bounded.
  assert.equal(weekly.maxRunsPerWeek, null);
  assert.equal(weekly.maxAnalysisMinutes, 25);
  assert.equal(parseArgs(['--max-runs-per-week', '4']).maxRunsPerWeek, 4);
  assert.equal(
    parseArgs(['--max-analysis-minutes', '40']).maxAnalysisMinutes,
    40,
  );

  const collect = parseArgs(['--collect-only', '--run', '99']);
  assert.equal(collect.collectOnly, true);
  assert.equal(collect.skipAi, true);
  assert.equal(collect.skipScenarioArtifacts, true);
  assert.equal(collect.run, '99');
});

test('resolveRunsInRange keeps a half-open scheduled window', () => {
  const runs = [
    {
      databaseId: 1,
      event: 'schedule',
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-14T00:00:00Z',
    },
    {
      databaseId: 2,
      event: 'workflow_dispatch',
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-16T00:00:00Z',
    },
    {
      databaseId: 3,
      event: 'schedule',
      status: 'completed',
      conclusion: 'failure',
      createdAt: '2026-09-20T18:00:00Z',
    },
    {
      databaseId: 4,
      event: 'schedule',
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-21T00:00:00Z',
    },
  ];

  const selected = resolveRunsInRange(runs, {
    sinceIso: '2026-09-14T00:00:00Z',
    untilIso: '2026-09-21T00:00:00Z',
  });

  assert.deepEqual(
    selected.map((run) => run.databaseId),
    [3, 1],
  );
});

test('sampleRunsAcrossNewestDays covers the newest days instead of expired early-week runs', () => {
  const monday = Array.from({ length: 4 }, (_, index) => ({
    databaseId: index + 1,
    createdAt: `2026-09-14T0${index}:00:00Z`,
  }));
  const sunday = Array.from({ length: 4 }, (_, index) => ({
    databaseId: index + 11,
    createdAt: `2026-09-20T0${index}:00:00Z`,
  }));
  // Newest first, as GitHub run lists are sorted.
  const runs = [...sunday, ...monday];

  const sampled = sampleRunsAcrossNewestDays(runs, 4);

  assert.deepEqual(
    sampled.map((run) => run.databaseId),
    [11, 12, 1, 2],
  );
  assert.equal(sampleRunsAcrossNewestDays(runs.slice(0, 3), 6).length, 3);
});

test('sampleRunsAcrossNewestDays still returns one run when the limit is one', () => {
  const runs = [
    { databaseId: 3, createdAt: '2026-09-20T00:00:00Z' },
    { databaseId: 2, createdAt: '2026-09-19T00:00:00Z' },
    { databaseId: 1, createdAt: '2026-09-14T00:00:00Z' },
  ];

  assert.deepEqual(sampleRunsAcrossNewestDays(runs, 1), [runs[0]]);
});

test('sampleRunsAcrossNewestDays round-robins two days instead of draining one', () => {
  const runs = [
    { databaseId: 20, createdAt: '2026-09-20T12:00:00Z' },
    { databaseId: 19, createdAt: '2026-09-20T06:00:00Z' },
    { databaseId: 18, createdAt: '2026-09-19T12:00:00Z' },
    { databaseId: 17, createdAt: '2026-09-19T06:00:00Z' },
  ];

  assert.deepEqual(
    sampleRunsAcrossNewestDays(runs, 2).map((run) => run.databaseId),
    [20, 18],
  );
});

test('planWeeklyRuns keeps every run when no cap is given', () => {
  const runs = Array.from({ length: 10 }, (_, index) => ({
    databaseId: index + 1,
    createdAt: `2026-09-1${index}T00:00:00Z`,
  }));

  const plan = planWeeklyRuns(runs, new Map([['2', {}]]));

  assert.equal(plan.selected.length, 10);
  assert.equal(plan.skipped, 0);
});

test('planWeeklyRuns keeps every collected run and caps the rest', () => {
  const runs = Array.from({ length: 10 }, (_, index) => ({
    databaseId: index + 1,
  }));
  const collected = new Map([
    ['2', {}],
    ['7', {}],
  ]);

  const plan = planWeeklyRuns(runs, collected, 3);

  const selectedIds = plan.selected.map((run) => run.databaseId);
  assert.ok(selectedIds.includes(2));
  assert.ok(selectedIds.includes(7));
  assert.equal(plan.selected.length, 5);
  assert.equal(plan.skipped, 5);
});

test('collected reports from an older schema are not reused', () => {
  const scenario = {
    scenario: 'Perps add funds',
    attempts: [0],
    profiles: [],
    jsWorkMs: 10,
    jsDutyPct: 20,
  };

  assert.equal(
    isReusableCollectedReport({ meta: { runId: '1' }, scenarios: [scenario] }),
    true,
  );
  // Reports written before per-scenario attempts existed crashed the window.
  assert.equal(
    isReusableCollectedReport({
      meta: { runId: '1' },
      scenarios: [{ ...scenario, attempts: undefined }],
    }),
    false,
  );
  assert.equal(
    isReusableCollectedReport({
      meta: { runId: '1', mode: 'lookback-window' },
      scenarios: [scenario],
    }),
    false,
  );
  assert.equal(
    isReusableCollectedReport({ meta: { runId: '1' }, scenarios: [] }),
    false,
  );
  assert.equal(isReusableCollectedReport({ scenarios: [scenario] }), false);
});

test('reportsForRuns keeps the week when one run lost its artifacts', async () => {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'weekly-reports-'),
  );
  const analyze = async ({ runId }) => {
    if (runId === '2') {
      throw new Error('No named Hermes profiles found under hermes-cpuprofiles/');
    }
    return {
      meta: { runId, profileCount: 1, symbolicatedProfileCount: 1 },
      scenarios: [],
    };
  };

  const { reports, skipped } = await reportsForRuns({
    args: { repo: 'MetaMask/metamask-mobile' },
    runs: [{ databaseId: 1 }, { databaseId: 2 }, { databaseId: 3 }],
    collectedByRunId: new Map(),
    outputDirectory,
    skillAnalyzerPath: 'analyzer.cjs',
    label: 'this-week',
    analyze,
  });

  assert.deepEqual(
    reports.map((report) => report.meta.runId),
    ['1', '3'],
  );
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].runId, '2');
});

test('reportsForRuns stops rebuilding runs once the time budget is gone', async () => {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'weekly-budget-'),
  );
  let clockMs = 0;
  const analyze = async ({ runId }) => {
    clockMs += 60_000;
    return { meta: { runId }, scenarios: [] };
  };

  const { reports, skipped } = await reportsForRuns({
    args: {},
    // Newest first, so the budget buys the runs most likely to still exist.
    runs: [
      { databaseId: 4 },
      { databaseId: 3 },
      { databaseId: 2 },
      { databaseId: 1 },
    ],
    collectedByRunId: new Map([['1', { meta: {}, scenarios: [] }]]),
    outputDirectory,
    skillAnalyzerPath: 'analyzer.cjs',
    label: 'this-week',
    deadlineMs: 120_000,
    clock: () => clockMs,
    analyze,
  });

  // A collected report costs nothing, so it survives an exhausted budget.
  assert.deepEqual(
    reports.map((report) => report.meta.runId),
    ['4', '3', '1'],
  );
  assert.deepEqual(skipped, [
    { runId: '2', reason: 'analysis time budget exhausted' },
  ]);
});

test('reportsForRuns prefers a collected report over re-analysis', async () => {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'weekly-collected-'),
  );
  let analyzed = 0;

  const { reports } = await reportsForRuns({
    args: {},
    runs: [{ databaseId: 7, url: 'https://example.com/7', createdAt: 'x' }],
    collectedByRunId: new Map([['7', { meta: {}, scenarios: [] }]]),
    outputDirectory,
    skillAnalyzerPath: 'analyzer.cjs',
    label: 'this-week',
    analyze: async () => {
      analyzed += 1;
      return { meta: {}, scenarios: [] };
    },
  });

  assert.equal(analyzed, 0);
  assert.equal(reports[0].meta.runId, '7');
  assert.equal(reports[0].meta.runUrl, 'https://example.com/7');
});

test('parseArgs supports local Hermes-only analysis', () => {
  const args = parseArgs([
    '--run',
    '123',
    '--scenario',
    'Cold Start',
    '--current-dir',
    '/tmp/profiles',
    '--skip-ai',
  ]);
  assert.equal(args.run, '123');
  assert.equal(args.scenario, 'Cold Start');
  assert.equal(args.currentDir, '/tmp/profiles');
  assert.equal(args.skipAi, true);
});

test('resolveLatestRun prefers successful scheduled runs', () => {
  const selected = resolveLatestRun([
    {
      databaseId: 1,
      event: 'workflow_dispatch',
      status: 'completed',
      conclusion: 'success',
    },
    {
      databaseId: 2,
      event: 'schedule',
      status: 'completed',
      conclusion: 'success',
    },
  ]);
  assert.equal(selected.databaseId, 2);
});

test('findHermesProfiles excludes hashed Playwright attachment copies', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-find-'));
  const named = path.join(root, 'reports', 'hermes-cpuprofiles');
  const dedicated = path.join(
    root,
    'hermes-cpuprofiles-android-imported-wallet-Pixel-14',
  );
  const hashed = path.join(root, 'playwright-report', 'data');
  fs.mkdirSync(named, { recursive: true });
  fs.mkdirSync(dedicated, { recursive: true });
  fs.mkdirSync(hashed, { recursive: true });
  const namedProfile = path.join(named, 'scenario.cpuprofile');
  const dedicatedProfile = path.join(dedicated, 'dedicated.cpuprofile');
  fs.writeFileSync(namedProfile, '{}');
  fs.writeFileSync(dedicatedProfile, '{}');
  fs.writeFileSync(path.join(hashed, 'abc123.cpuprofile'), '{}');

  const result = findHermesProfiles(root);

  assert.deepEqual(result.sort(), [namedProfile, dedicatedProfile].sort());
});

test('aggregator finds named profiles but excludes Playwright attachment copies', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-aggregate-find-'));
  const named = path.join(root, 'reports', 'hermes-cpuprofiles');
  const hashed = path.join(root, 'playwright-report', 'data');
  fs.mkdirSync(named, { recursive: true });
  fs.mkdirSync(hashed, { recursive: true });
  const namedProfile = path.join(named, 'scenario.cpuprofile');
  fs.writeFileSync(namedProfile, '{}');
  fs.writeFileSync(path.join(hashed, 'abc123.cpuprofile'), '{}');

  const result = findHermesCpuProfileFiles(root);

  assert.deepEqual(result, [namedProfile]);
});

test('aggregator skips duplicate profile names without changing scenario identity', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-aggregate-'));
  const first = path.join(root, 'first', 'hermes-cpuprofiles');
  const second = path.join(root, 'second', 'hermes-cpuprofiles');
  const output = path.join(root, 'output');
  fs.mkdirSync(first, { recursive: true });
  fs.mkdirSync(second, { recursive: true });
  fs.writeFileSync(path.join(first, 'scenario.cpuprofile'), '{"run":1}');
  fs.writeFileSync(path.join(second, 'scenario.cpuprofile'), '{"run":2}');

  const copied = collectHermesCpuProfiles(
    [path.dirname(first), path.dirname(second)],
    output,
  );

  const outputFiles = fs.readdirSync(path.join(output, 'hermes-cpuprofiles'));
  assert.equal(copied, 1);
  assert.deepEqual(outputFiles, ['scenario.cpuprofile']);
  assert.equal(
    fs.readFileSync(
      path.join(output, 'hermes-cpuprofiles', 'scenario.cpuprofile'),
      'utf8',
    ),
    '{"run":1}',
  );
});

test('findSkillAnalyzer locates the analyzer installed by yarn skills', () => {
  assert.match(
    findSkillAnalyzer(),
    /mms-swaps-cpu-profile-audit\/scripts\/analyze-cpuprofile\.cjs$/,
  );
});

test('runSkillAnalyzer compacts canonical skill timing output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-analyzer-'));
  const analyzer = path.join(root, 'analyzer.cjs');
  fs.writeFileSync(
    analyzer,
    `console.log(JSON.stringify({
      format: 'raw-hermes',
      durationMs: 1000,
      totalFrames: 50,
      attributableSelfMicros: 600000,
      runtimeSelfMicros: 400000,
      swapsSelfMicros: 100000,
      swapsInclusiveMicros: 200000,
      areas: [],
      contextPathAreas: [],
      contextConcurrentAreas: [],
      runtimeAreas: [{ area: 'Garbage collection', selfMicros: 50000 }],
      topInScope: [{
        name: 'useQuotes',
        url: 'app/components/UI/Bridge/hooks/useQuotes.ts',
        line: 10,
        category: 'JavaScript',
        selfMicros: 100000,
        totalMicros: 200000,
        calls: 2,
        relation: 'Swaps-owned',
        area: 'Bridge hooks',
        ownedBySwaps: true
      }],
      topContext: []
    }));`,
  );
  const audit = runSkillAnalyzer('/tmp/profile.cpuprofile', analyzer, {
    symbolicated: true,
  });
  assert.equal(audit.analyzer, 'mms-swaps-cpu-profile-audit');
  assert.equal(audit.jsWorkMs, 600);
  assert.equal(audit.runtimeAndIdleMs, 400);
  assert.equal(audit.topSwapsFrames[0].selfMs, 100);
  assert.equal(audit.caveat, null);
});

test('findAndroidSourcemaps finds only Android map files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sourcemap-find-'));
  fs.mkdirSync(path.join(root, 'android-sourcemaps-main-e2e-bs-with-srp'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, 'ios-sourcemaps'), { recursive: true });
  const androidMap = path.join(
    root,
    'android-sourcemaps-main-e2e-bs-with-srp',
    'index.android.bundle.map',
  );
  fs.writeFileSync(androidMap, '{}');
  fs.writeFileSync(path.join(root, 'ios-sourcemaps', 'index.js.map'), '{}');
  assert.deepEqual(findAndroidSourcemaps(root), [androidMap]);
});

test('selectSourcemap keeps onboarding and imported-wallet variants separate', () => {
  const maps = [
    '/maps/index.android.bundle.with-srp.map',
    '/maps/index.android.bundle.without-srp.map',
  ];
  assert.equal(sourcemapVariant(maps[0]), 'with-srp');
  assert.equal(sourcemapVariant(maps[1]), 'without-srp');
  assert.equal(
    profileSourcemapVariant(
      '/profiles/browserstack-android-Warm_Start.cpuprofile',
    ),
    'with-srp',
  );
  assert.equal(
    selectSourcemap(
      '/profiles/android-onboarding-Cold_Start.cpuprofile',
      maps,
    ),
    maps[1],
  );
  assert.equal(
    selectSourcemap(
      '/profiles/browserstack-android-Warm_Start.cpuprofile',
      maps,
    ),
    maps[0],
  );
});

test('selectSourcemap rejects ambiguous matching maps', () => {
  assert.equal(
    selectSourcemap(
      '/profiles/browserstack-android-Warm_Start.cpuprofile',
      [
        '/maps/one/index.android.bundle.with-srp.map',
        '/maps/two/index.android.bundle.with-srp.map',
      ],
    ),
    null,
  );
});

test('convertProfile symbolicates locally without React Native CLI config', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-convert-'));
  const profilePath = path.join(root, 'sample.cpuprofile');
  const sourcemapPath = path.join(root, 'index.android.bundle.map');
  const outputDirectory = path.join(root, 'output');
  fs.writeFileSync(
    profilePath,
    JSON.stringify({
      samples: [
        { sf: 2, ts: '1000', pid: 1, tid: 1 },
        { sf: 2, ts: '2000', pid: 1, tid: 1 },
      ],
      stackFrames: {
        1: { name: '[root]', category: 'root' },
        2: {
          name: 'minified',
          category: 'JavaScript',
          parent: 1,
          funcVirtAddr: '0',
          offset: '0',
        },
      },
    }),
  );
  fs.writeFileSync(
    sourcemapPath,
    JSON.stringify({
      version: 3,
      sources: ['app/example.ts'],
      names: ['renderExample'],
      // Generated line 1, column 1 → app/example.ts:42, name renderExample.
      mappings: 'CAyCAA',
      file: 'index.bundle',
    }),
  );

  const convertedPath = await convertProfile(
    profilePath,
    sourcemapPath,
    outputDirectory,
  );
  const converted = fs.readFileSync(convertedPath, 'utf8');
  assert.match(converted, /app\/example\.ts/);
  assert.match(converted, /renderExample/);
  assert.equal(
    fs.existsSync(path.join(outputDirectory, 'sample-prepared.cpuprofile')),
    false,
  );
});

test('parseProfileFileName treats plain file as logical segment 1', () => {
  assert.deepEqual(
    parseProfileFileName(
      'browserstack-android-Cold_Start__Login.cpuprofile',
    ),
    {
      fileName: 'browserstack-android-Cold_Start__Login.cpuprofile',
      project: 'browserstack-android',
      scenario: 'Cold_Start__Login',
      retry: 0,
      segment: 1,
      copyIndex: null,
    },
  );
});

test('parseProfileFileName reads retry and segment numbers', () => {
  const parsed = parseProfileFileName(
    'browserstack-android-Warm_Start.retry-2.segment-3.cpuprofile',
  );
  assert.equal(parsed.retry, 2);
  assert.equal(parsed.segment, 3);
  assert.equal(parsed.scenario, 'Warm_Start');
});

test('summarizeHermesProfile reads samples and stackFrames', () => {
  const summary = summarizeHermesProfile({
    samples: [
      { sf: 3, weight: '1', ts: '1000' },
      { sf: 3, weight: '1', ts: '2000' },
      { sf: 2, weight: '1', ts: '3000' },
    ],
    stackFrames: {
      1: { name: '[root]', category: 'root' },
      2: {
        name: 'global',
        category: 'JavaScript',
        parent: 1,
        funcVirtAddr: '1',
      },
      3: {
        name: 'renderAssets',
        category: 'JavaScript',
        parent: 2,
        funcVirtAddr: '2',
      },
    },
  });
  assert.equal(summary.format, 'hermes-sampling-profile');
  assert.equal(summary.sampleCount, 3);
  assert.equal(summary.stackFrameCount, 3);
  assert.equal(summary.durationMs, 2);
  assert.equal(summary.rootSharePct, 0);
  assert.equal(summary.topSelfFrames[0].name, 'renderAssets');
  assert.equal(summary.topSelfFrames[0].sharePct, 66.67);
  assert.equal(summary.topInclusiveFrames[0].name, 'global');
  assert.equal(summary.topInclusiveFrames[0].sharePct, 100);
});

test('inclusive frame percentages deduplicate recursion within one sample', () => {
  const summary = summarizeHermesProfile({
    samples: [{ sf: 3, weight: '1', ts: '1000' }],
    stackFrames: {
      1: { name: '[root]', category: 'root' },
      2: {
        name: 'recursiveWalk',
        category: 'JavaScript',
        parent: 1,
        funcVirtAddr: '1',
        offset: '10',
      },
      3: {
        name: 'recursiveWalk',
        category: 'JavaScript',
        parent: 2,
        funcVirtAddr: '1',
        offset: '10',
      },
    },
  });
  assert.equal(summary.topInclusiveFrames[0].name, 'recursiveWalk');
  assert.equal(summary.topInclusiveFrames[0].samples, 1);
  assert.equal(summary.topInclusiveFrames[0].sharePct, 100);
});

test('groupProfiles combines logical segment 1 through N into one scenario', () => {
  const grouped = groupProfiles([
    profile('browserstack-android-Cold_Start.cpuprofile'),
    profile('browserstack-android-Cold_Start.segment-2.cpuprofile'),
    profile('browserstack-android-Cold_Start.segment-3.cpuprofile'),
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].profileCount, 3);
  assert.equal(grouped[0].segmentCount, 3);
  assert.deepEqual(
    grouped[0].profiles.map((item) => item.segment),
    [1, 2, 3],
  );
  assert.equal(grouped[0].sampleCount, 30);
});

test('groupProfiles keeps retries in the same scenario with locations', () => {
  const grouped = groupProfiles([
    profile('browserstack-android-Warm_Start.cpuprofile', {
      skillAudit: {
        jsWorkMs: 10,
        topSwapsFrames: [],
        topNonSwapsFrames: [],
      },
    }),
    profile('browserstack-android-Warm_Start.retry-1.cpuprofile', {
      skillAudit: {
        jsWorkMs: 20,
        topSwapsFrames: [],
        topNonSwapsFrames: [],
      },
    }),
    profile('browserstack-android-Warm_Start.retry-1.segment-2.cpuprofile', {
      skillAudit: {
        jsWorkMs: 20,
        topSwapsFrames: [],
        topNonSwapsFrames: [],
      },
    }),
  ]);
  assert.deepEqual(grouped[0].attempts, [0, 1]);
  assert.equal(grouped[0].selectedAttempt, 1);
  assert.deepEqual(grouped[0].excludedAttempts, [0]);
  assert.equal(grouped[0].profileCount, 2);
  assert.equal(grouped[0].totalProfileCount, 3);
  assert.equal(grouped[0].segmentCount, 2);
  assert.deepEqual(
    grouped[0].topSelfFrames[0].locations.map(
      ({ retry, segment }) => `${retry}:${segment}`,
    ),
    ['1:1', '1:2'],
  );
});

test('groupProfiles uses only the worst retry across its segments', () => {
  const grouped = groupProfiles([
    profile('browserstack-android-Warm_Start.cpuprofile', {
      skillAudit: {
        captureLengthMs: 100,
        jsWorkMs: 40,
        runtimeAndIdleMs: 60,
        topSwapsFrames: [],
        topNonSwapsFrames: [],
      },
    }),
    profile('browserstack-android-Warm_Start.retry-1.cpuprofile', {
      skillAudit: {
        captureLengthMs: 100,
        jsWorkMs: 20,
        runtimeAndIdleMs: 80,
        topSwapsFrames: [],
        topNonSwapsFrames: [],
      },
    }),
  ]);
  assert.equal(grouped[0].selectedAttempt, 0);
  assert.equal(grouped[0].jsWorkMs, 40);
  assert.equal(grouped[0].averageJsWorkMs, 40);
  assert.equal(grouped[0].jsDutyPct, 40);
});

test('scenario filter matches sanitized Hermes name', () => {
  const grouped = groupProfiles(
    [
      profile('browserstack-android-Cold_Start.cpuprofile'),
      profile('browserstack-android-Warm_Start.cpuprofile'),
    ],
    'Cold Start',
  );
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].scenario, 'Cold_Start');
});

test('reports explicitly state that BrowserStack metrics are excluded', () => {
  const report = {
    meta: {
      runId: '1',
      runUrl: 'https://example.com/run',
      profileCount: 1,
      symbolicatedProfileCount: 0,
      ai: false,
    },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile'),
    ]),
    aiAnalysis: null,
  };
  assert.match(
    buildAiBriefing(report),
    /mms-swaps-cpu-profile-audit.*parser/s,
  );
  assert.match(
    buildAiBriefing(report),
    /deterministic report is already generated/,
  );
  assert.match(
    buildAiBriefing(report),
    /HARD RULE: every profile lacks matching sourcemaps/,
  );
  // The deterministic footer owns the sourcemap caveat and the counts, so the
  // agent must not restate either and duplicate them in the same message.
  assert.match(
    buildAiBriefing(report),
    /Do not add a caveat, disclaimer, or source-map note/,
  );
  assert.match(buildAiBriefing(report), /Do not state totals such as how many/);
  assert.doesNotMatch(buildAiBriefing(report), /add one factual caveat line/);
  assert.match(buildMarkdown(report), /BrowserStack app-profiling metrics are excluded/);
  assert.match(buildMarkdown(report), /Per-scenario skill analysis/);
  assert.match(buildMarkdown(report), /JS duty cycle/);
  assert.match(buildSlack(report), /Hermes CPU sampling only/);
  assert.doesNotMatch(buildSlack(report), /Top sampled frames by scenario/);
});

test('reports mention a retry only when the scenario had several attempts', () => {
  const singleAttempt = {
    meta: { profileCount: 1, symbolicatedProfileCount: 0, ai: false },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile'),
    ]),
    aiAnalysis: null,
  };
  assert.doesNotMatch(buildSlack(singleAttempt), /retry/);
  assert.doesNotMatch(buildMarkdown(singleAttempt), /retry/);
  assert.match(
    buildMarkdown(singleAttempt),
    /Profiles with a matching sourcemap \| 0\/1/,
  );

  const withRetries = {
    meta: { profileCount: 2, symbolicatedProfileCount: 0, ai: false },
    scenarios: groupProfiles([
      profile('browserstack-android-Warm_Start.cpuprofile', {
        skillAudit: {
          jsWorkMs: 10,
          runtimeAndIdleMs: 10,
          topSwapsFrames: [],
          topNonSwapsFrames: [],
        },
      }),
      profile('browserstack-android-Warm_Start.retry-1.cpuprofile', {
        skillAudit: {
          jsWorkMs: 30,
          runtimeAndIdleMs: 10,
          topSwapsFrames: [],
          topNonSwapsFrames: [],
        },
      }),
    ]),
    aiAnalysis: null,
  };
  assert.match(buildSlack(withRetries), /worst of 2 attempts: retry 1/);
  assert.match(
    buildMarkdown(withRetries),
    /Selected attempt \| worst of 2 attempts: retry 1/,
  );
});

test('Slack leads with a testing disclaimer and keeps sourcemaps as a caveat', () => {
  const report = {
    meta: { runId: '1', profileCount: 2, symbolicatedProfileCount: 0, ai: false },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile'),
      profile('android-onboarding-Fresh_Install.cpuprofile'),
    ]),
    aiAnalysis: null,
  };
  const slack = buildSlack(report);
  const [, disclaimer] = slack.split('\n');
  assert.match(disclaimer, /Testing experiment, not a production alert/);
  assert.match(
    slack,
    /2\/2 profiles had no matching sourcemap, so frame names cannot be traced/,
  );
  // Per-scenario sourcemap counters are noise in a chat digest.
  assert.doesNotMatch(slack, /sourcemaps \d+\/\d+/);
});

test('Slack omits the sourcemap caveat once every profile is symbolicated', () => {
  const report = {
    meta: { runId: '1', profileCount: 1, symbolicatedProfileCount: 1, ai: false },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile', {
        symbolicated: true,
      }),
    ]),
    aiAnalysis: null,
  };
  assert.doesNotMatch(buildSlack(report), /no matching sourcemap/);
});

test('Slack keeps the full Notes block and links the analysis artifact', () => {
  const notes = `${'fast-equals dominates Predict Deposit. '.repeat(40)}metroRequire is an outlier.`;
  const report = {
    meta: {
      runId: '35217706350',
      profileCount: 1,
      symbolicatedProfileCount: 1,
      ai: true,
      analysisArtifactsUrl:
        'https://github.com/MetaMask/metamask-mobile/actions/runs/88#artifacts',
    },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile', {
        symbolicated: true,
      }),
    ]),
    aiAnalysis: notes,
  };
  const slack = buildSlack(report);
  const markdown = buildMarkdown(report);

  assert.match(slack, /\*Notes\*/);
  assert.equal(slack.includes(notes), true);
  assert.match(slack, /\*Downloads\*/);
  assert.match(slack, /app-profiling-analysis/);
  assert.match(markdown, /## Downloads/);
  assert.match(markdown, /per-scenario JSON/);
});

test('writeScenarioArtifacts packages every segment and retry by scenario', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-artifacts-'));
  const raw = path.join(root, 'profiles');
  fs.mkdirSync(raw);
  const firstPath = path.join(
    raw,
    'browserstack-android-Perps.cpuprofile',
  );
  const retryPath = path.join(
    raw,
    'browserstack-android-Perps.retry-1.cpuprofile',
  );
  fs.writeFileSync(firstPath, '{"first":true}');
  fs.writeFileSync(retryPath, '{"retry":true}');
  const profiles = [
    {
      ...profile(path.basename(firstPath)),
      sourcePath: firstPath,
      analysisPath: firstPath,
    },
    {
      ...profile(path.basename(retryPath)),
      sourcePath: retryPath,
      analysisPath: retryPath,
    },
  ];
  const scenarios = groupProfiles(profiles);

  const artifacts = writeScenarioArtifacts(
    root,
    profiles,
    scenarios,
    '35217706350',
  );

  assert.equal(artifacts.length, 1);
  assert.match(artifacts[0].artifactName, /^hermes-profile-01-Perps$/);
  assert.deepEqual(
    fs
      .readdirSync(path.join(artifacts[0].path, 'raw'))
      .sort(),
    [path.basename(firstPath), path.basename(retryPath)].sort(),
  );
  assert.match(
    fs.readFileSync(path.join(artifacts[0].path, 'README.md'), 'utf8'),
    /Performance run: 35217706350/,
  );
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(path.join(root, 'scenario-artifacts.json'), 'utf8'),
    ),
    { include: artifacts },
  );
});

test('a worst first attempt is never labelled retry 0', () => {
  const report = {
    meta: { profileCount: 2, symbolicatedProfileCount: 0, ai: false },
    scenarios: groupProfiles([
      profile('browserstack-android-Warm_Start.cpuprofile', {
        skillAudit: {
          jsWorkMs: 40,
          runtimeAndIdleMs: 10,
          topSwapsFrames: [],
          topNonSwapsFrames: [],
        },
      }),
      profile('browserstack-android-Warm_Start.retry-1.cpuprofile', {
        skillAudit: {
          jsWorkMs: 5,
          runtimeAndIdleMs: 10,
          topSwapsFrames: [],
          topNonSwapsFrames: [],
        },
      }),
    ]),
    aiAnalysis: null,
  };
  assert.equal(report.scenarios[0].selectedAttempt, 0);
  assert.doesNotMatch(buildSlack(report), /retry 0/);
  assert.doesNotMatch(buildMarkdown(report), /retry 0/);
  assert.match(buildSlack(report), /worst of 2 attempts: first attempt/);
});

test('Slack suppresses frames below five percent of JS work', () => {
  const report = {
    meta: {
      runId: '1',
      profileCount: 1,
      symbolicatedProfileCount: 0,
      ai: false,
    },
    scenarios: groupProfiles([
      profile('browserstack-android-Cold_Start.cpuprofile', {
        skillAudit: {
          captureLengthMs: 100,
          jsWorkMs: 60,
          runtimeAndIdleMs: 40,
          topSwapsFrames: [],
          topNonSwapsFrames: [{ name: 'smallFrame', selfMs: 2 }],
        },
      }),
    ]),
    aiAnalysis: null,
  };
  assert.match(buildSlack(report), /No single frame reached 5% of JS work/);
  assert.doesNotMatch(buildSlack(report), /Top JS contributor: `smallFrame`/);
});

test('Slack conclusions name a repeated frame once instead of listing every scenario', () => {
  const modFrame = {
    name: 'mod',
    selfMs: 2000,
    url: '/node_modules/@metamask/key-tree/node_modules/@noble/curves/abstract/modular.js',
    line: 39,
  };
  const files = [
    'browserstack-android-Asset_View.cpuprofile',
    'browserstack-android-Swap_flow.cpuprofile',
    'browserstack-android-Predict_Deposit.cpuprofile',
    'browserstack-android-Perps_add_funds.cpuprofile',
    'browserstack-android-Money_Home_empty.cpuprofile',
  ];
  const profiles = files.map((fileName, index) =>
    profile(fileName, {
      symbolicated: true,
      skillAudit: {
        captureLengthMs: index === 4 ? 115000 : 40000,
        jsWorkMs: index === 4 ? 60000 : 20000,
        runtimeAndIdleMs: index === 4 ? 55000 : 20000,
        topSwapsFrames: [],
        topNonSwapsFrames: [
          {
            ...modFrame,
            selfMs: index === 4 ? 18000 : 2000,
          },
        ],
      },
    }),
  );
  profiles.push(
    profile('browserstack-android-Aggregated_Balance.cpuprofile', {
      symbolicated: true,
      skillAudit: {
        captureLengthMs: 38000,
        jsWorkMs: 23000,
        runtimeAndIdleMs: 15000,
        topSwapsFrames: [],
        topNonSwapsFrames: [
          {
            name: 'isPropertyEqual',
            selfMs: 2100,
            url: '/node_modules/fast-equals/dist/cjs/index.cjs',
            line: 281,
          },
        ],
      },
    }),
  );
  profiles.push(
    profile('android-onboarding-Cold_Start_To_Onboarding.cpuprofile', {
      symbolicated: true,
      skillAudit: {
        captureLengthMs: 17000,
        jsWorkMs: 1200,
        runtimeAndIdleMs: 16000,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ ...modFrame, selfMs: 50 }],
      },
    }),
  );
  const report = {
    meta: {
      runId: '1',
      profileCount: profiles.length,
      symbolicatedProfileCount: profiles.length,
      ai: false,
    },
    scenarios: groupProfiles(profiles),
    aiAnalysis: null,
  };
  const slack = buildSlack(report);
  const markdown = buildMarkdown(report);
  const conclusions = buildConclusions(report).join('\n');

  assert.match(slack, /\*Conclusions\*/);
  assert.match(conclusions, /`mod`.*is the top JS contributor in 5\/7 scenarios/);
  assert.match(conclusions, /`isPropertyEqual`/);
  assert.match(conclusions, /Low JS duty/);
  assert.match(markdown, /## Conclusions/);
  assert.doesNotMatch(slack, /\*Highest-signal scenarios/);
  const topContributorHits = slack.split('Top JS contributor: `mod`').length - 1;
  assert.ok(
    topContributorHits <= 5,
    `expected at most 5 repeated mod outcome lines, got ${topContributorHits}`,
  );
});

test('conclusions still name the leading hotspot when it is not dominant', () => {
  const profiles = [
    profile('browserstack-android-Wallet.cpuprofile', {
      skillAudit: {
        captureLengthMs: 40000,
        jsWorkMs: 20000,
        runtimeAndIdleMs: 20000,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'mod', selfMs: 4000 }],
      },
    }),
    profile('browserstack-android-Send.cpuprofile', {
      skillAudit: {
        captureLengthMs: 35000,
        jsWorkMs: 18000,
        runtimeAndIdleMs: 17000,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'mod', selfMs: 3500 }],
      },
    }),
    profile('browserstack-android-Perps.cpuprofile', {
      skillAudit: {
        captureLengthMs: 50000,
        jsWorkMs: 30000,
        runtimeAndIdleMs: 20000,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'isPropertyEqual', selfMs: 2100 }],
      },
    }),
    profile('browserstack-android-Swap.cpuprofile', {
      skillAudit: {
        captureLengthMs: 22000,
        jsWorkMs: 12000,
        runtimeAndIdleMs: 10000,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'renderRow', selfMs: 900 }],
      },
    }),
  ];
  const conclusions = buildConclusions({
    meta: { runId: '2', profileCount: 4, symbolicatedProfileCount: 0, ai: false },
    scenarios: groupProfiles(profiles),
    aiAnalysis: null,
  }).join('\n');

  assert.match(conclusions, /`mod` leads 2 scenarios/);
  assert.doesNotMatch(conclusions, /is the top JS contributor/);
  assert.match(conclusions, /`isPropertyEqual`/);
  assert.match(conclusions, /`renderRow`/);
});

function windowScenario(
  name,
  { jsWorkMs, runtimeAndIdleMs = 100, frames = [] },
) {
  return groupProfiles([
    profile(`browserstack-android-${name}.cpuprofile`, {
      skillAudit: {
        captureLengthMs: jsWorkMs + runtimeAndIdleMs,
        jsWorkMs,
        runtimeAndIdleMs,
        topSwapsFrames: [],
        topNonSwapsFrames: frames,
      },
    }),
  ])[0];
}

function windowRunReport(runId, scenarios) {
  return {
    meta: {
      runId,
      runUrl: `https://github.com/MetaMask/metamask-mobile/actions/runs/${runId}`,
      createdAt: `2026-09-16T0${runId}:00:00Z`,
      profileCount: scenarios.length,
      symbolicatedProfileCount: 0,
    },
    scenarios,
  };
}

function threeRunWindow() {
  const hotFrame = (selfMs) => ({ name: 'formatDate', selfMs, calls: 4 });
  return aggregateWindow(
    [
      windowRunReport('1', [
        windowScenario('Perps', {
          jsWorkMs: 100,
          frames: [hotFrame(40), { name: 'noise', selfMs: 2 }],
        }),
      ]),
      windowRunReport('2', [
        windowScenario('Perps', { jsWorkMs: 120, frames: [hotFrame(48)] }),
      ]),
      windowRunReport('3', [
        windowScenario('Perps', { jsWorkMs: 400, frames: [hotFrame(60)] }),
        windowScenario('Warm_Start', { jsWorkMs: 10, frames: [] }),
      ]),
    ],
    {
      lookbackHours: 24,
      since: '2026-09-15T07:00:00.000Z',
      until: '2026-09-16T07:00:00.000Z',
      repo: 'MetaMask/metamask-mobile',
    },
  );
}

test('parseArgs reads the lookback window in hours or days', () => {
  assert.equal(parseArgs(['--lookback-hours', '24']).lookbackHours, 24);
  assert.equal(parseArgs(['--days', '2']).lookbackHours, 48);
  assert.equal(parseArgs([]).lookbackHours, null);
});

test('resolveRunsInWindow keeps finished runs inside the window, newest first', () => {
  const now = Date.parse('2026-09-16T07:00:00Z');
  const runs = resolveRunsInWindow(
    [
      {
        databaseId: 1,
        event: 'schedule',
        status: 'completed',
        conclusion: 'success',
        createdAt: '2026-09-16T06:00:00Z',
      },
      {
        // A failed run still profiled the scenarios it reached.
        databaseId: 2,
        event: 'schedule',
        status: 'completed',
        conclusion: 'failure',
        createdAt: '2026-09-16T00:00:00Z',
      },
      {
        databaseId: 3,
        event: 'schedule',
        status: 'completed',
        conclusion: 'success',
        createdAt: '2026-09-14T00:00:00Z',
      },
      {
        databaseId: 4,
        event: 'workflow_dispatch',
        status: 'completed',
        conclusion: 'success',
        createdAt: '2026-09-16T05:00:00Z',
      },
      {
        databaseId: 5,
        event: 'schedule',
        status: 'in_progress',
        conclusion: null,
        createdAt: '2026-09-16T06:30:00Z',
      },
    ],
    { lookbackHours: 24, now },
  );
  assert.deepEqual(
    runs.map((run) => run.databaseId),
    [1, 2],
  );
});

test('median takes the middle value and averages an even sample', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 6]), 2.5);
  assert.equal(median([]), 0);
});

test('scenarioFrameTotals sums frame self time across segments', () => {
  const scenario = groupProfiles([
    profile('browserstack-android-Perps.cpuprofile', {
      skillAudit: {
        jsWorkMs: 50,
        runtimeAndIdleMs: 50,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'formatDate', selfMs: 20, calls: 2 }],
      },
    }),
    profile('browserstack-android-Perps.segment-2.cpuprofile', {
      skillAudit: {
        jsWorkMs: 50,
        runtimeAndIdleMs: 50,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'formatDate', selfMs: 5, calls: 1 }],
      },
    }),
  ])[0];
  assert.deepEqual(scenarioFrameTotals(scenario), [
    { name: 'formatDate', url: null, line: null, selfMs: 25, calls: 3 },
  ]);
});

test('aggregateWindow reports per-run medians and how often a frame stayed hot', () => {
  const window = threeRunWindow();
  assert.equal(window.meta.runCount, 3);
  assert.equal(window.meta.lookbackHours, 24);
  const [perps] = window.scenarios;
  assert.equal(perps.scenario, 'Perps');
  assert.equal(perps.runsObserved, 3);
  assert.equal(perps.runsTotal, 3);
  assert.equal(perps.medianJsWorkMs, 120);
  assert.equal(perps.minJsWorkMs, 100);
  assert.equal(perps.maxJsWorkMs, 400);
  assert.equal(perps.peakRunId, '3');
  assert.equal(perps.spikeRatio, 3.33);
  assert.deepEqual(
    perps.contributors.map(({ name, runsHot, medianSelfMs }) => ({
      name,
      runsHot,
      medianSelfMs,
    })),
    [{ name: 'formatDate', runsHot: 3, medianSelfMs: 48 }],
  );
  // A scenario missing from earlier runs keeps its own sample count.
  const warmStart = window.scenarios.find(
    (scenario) => scenario.scenario === 'Warm_Start',
  );
  assert.equal(warmStart.runsObserved, 1);
});

test('window digest drops frames that were hot in only one run', () => {
  const [perps] = threeRunWindow().scenarios;
  assert.equal(
    perps.contributors.some((contributor) => contributor.name === 'noise'),
    false,
  );
  assert.doesNotMatch(buildWindowSlack(threeRunWindow()), /noise/);
});

test('window shares divide by the same JS work the frames were summed over', () => {
  const twoSegments = groupProfiles([
    profile('browserstack-android-Perps.cpuprofile', {
      skillAudit: {
        jsWorkMs: 100,
        runtimeAndIdleMs: 100,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'formatDate', selfMs: 10 }],
      },
    }),
    profile('browserstack-android-Perps.segment-2.cpuprofile', {
      skillAudit: {
        jsWorkMs: 100,
        runtimeAndIdleMs: 100,
        topSwapsFrames: [],
        topNonSwapsFrames: [{ name: 'formatDate', selfMs: 10 }],
      },
    }),
  ]);
  const window = aggregateWindow([windowRunReport('1', twoSegments)], {
    lookbackHours: 24,
  });
  const [scenario] = window.scenarios;
  assert.equal(scenario.medianJsWorkMs, 200);
  assert.equal(scenario.contributors[0].medianSelfMs, 20);
  assert.equal(scenario.contributors[0].medianSharePct, 10);
});

test('a flat profile is named instead of hiding its repeated frames', () => {
  const flat = aggregateWindow(
    [
      windowRunReport('1', [
        windowScenario('Perps', {
          jsWorkMs: 1000,
          frames: [{ name: 'propagateParentContextChanges', selfMs: 20 }],
        }),
      ]),
      windowRunReport('2', [
        windowScenario('Perps', {
          jsWorkMs: 1000,
          frames: [{ name: 'propagateParentContextChanges', selfMs: 30 }],
        }),
      ]),
    ],
    { lookbackHours: 24 },
  );
  const [scenario] = flat.scenarios;
  assert.equal(scenario.hasDominantFrame, false);
  assert.equal(scenario.contributors.length, 1);
  const slack = buildWindowSlack(flat);
  assert.match(
    slack,
    /No scenario concentrated 5% of its JS work in one frame/,
  );
  assert.match(slack, /`propagateParentContextChanges` 25\.0 ms median self/);
  assert.match(slack, /every scenario above stayed under 1\.5× its median/);
  assert.match(
    buildWindowMarkdown(flat),
    /flat profile — every repeated frame stays below 5% of JS work/,
  );
});

test('window Slack digest separates the median from the spikiest run', () => {
  const slack = buildWindowSlack(threeRunWindow());
  const [, disclaimer] = slack.split('\n');
  assert.match(disclaimer, /testing experiment, not a production alert/);
  assert.match(slack, /last 24h/);
  assert.match(slack, /median JS 120\.0 ms \(range 100\.0 ms – 400\.0 ms\)/);
  assert.match(slack, /Spikiest run <[^|]+\|3> at 400\.0 ms \(3\.33× the median\)/);
  assert.match(
    slack,
    /`formatDate` 48\.0 ms median self, 40\.0% of JS work, hot in 3\/3 runs/,
  );
  // A spiky scenario must not be described as stable in the same digest.
  assert.doesNotMatch(slack, /Run-to-run spread/);
  assert.match(slack, /ran in 1\/3 runs/);
  assert.match(slack, /Hermes CPU sampling only/);
  assert.match(slack, /4\/4 profiles had no matching sourcemap/);
});

test('window markdown lists every run and its per-run numbers', () => {
  const markdown = buildWindowMarkdown(threeRunWindow());
  assert.match(markdown, /# Hermes CPU-profile analysis — last 24h/);
  assert.match(markdown, /## Runs analyzed/);
  assert.match(markdown, /Median JS work per run \| 120\.0 ms/);
  assert.match(markdown, /Runs observed \| 3\/3/);
  assert.match(markdown, /BrowserStack app-profiling metrics are excluded/);
});
