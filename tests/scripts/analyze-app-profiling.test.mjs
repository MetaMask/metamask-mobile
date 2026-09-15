/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  parseArgs,
  resolveLatestRun,
  findHermesProfiles,
  findAndroidSourcemaps,
  sourcemapVariant,
  profileSourcemapVariant,
  selectSourcemap,
  findSkillAnalyzer,
  runSkillAnalyzer,
  parseProfileFileName,
  summarizeHermesProfile,
  groupProfiles,
  buildAiBriefing,
  buildMarkdown,
  buildSlack,
} from './analyze-app-profiling.mjs';

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
  const hashed = path.join(root, 'playwright-report', 'data');
  fs.mkdirSync(named, { recursive: true });
  fs.mkdirSync(hashed, { recursive: true });
  fs.writeFileSync(path.join(named, 'scenario.cpuprofile'), '{}');
  fs.writeFileSync(path.join(hashed, 'abc123.cpuprofile'), '{}');
  assert.deepEqual(findHermesProfiles(root), [
    path.join(named, 'scenario.cpuprofile'),
  ]);
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
    profile('browserstack-android-Warm_Start.cpuprofile'),
    profile('browserstack-android-Warm_Start.retry-1.cpuprofile'),
    profile('browserstack-android-Warm_Start.retry-1.segment-2.cpuprofile'),
  ]);
  assert.deepEqual(grouped[0].attempts, [0, 1]);
  assert.equal(grouped[0].segmentCount, 3);
  assert.deepEqual(
    grouped[0].topSelfFrames[0].locations.map(
      ({ retry, segment }) => `${retry}:${segment}`,
    ),
    ['0:1', '1:1', '1:2'],
  );
});

test('groupProfiles averages JS work across retries and segments', () => {
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
  assert.equal(grouped[0].jsWorkMs, 60);
  assert.equal(grouped[0].averageJsWorkMs, 30);
  assert.equal(grouped[0].jsDutyPct, 30);
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
  assert.match(buildMarkdown(report), /BrowserStack app-profiling metrics are excluded/);
  assert.match(buildMarkdown(report), /Per-scenario skill analysis/);
  assert.match(buildMarkdown(report), /JS duty cycle/);
  assert.match(buildSlack(report), /Hermes CPU sampling only/);
  assert.doesNotMatch(buildSlack(report), /Top sampled frames by scenario/);
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
