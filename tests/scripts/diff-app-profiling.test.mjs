import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseDeviceKey,
  devicesMatch,
  isScenarioGreen,
  computeDelta,
  getMetricRows,
  hasUsableProfilingSummary,
  findMatchingArtifact,
  buildScenarioComment,
  parseArgs,
  buildRegressionSummary,
  shouldIncludeScenarioInComment,
  buildEmbeddedProfilingSection,
  COMMENT_MARKER,
} from './diff-app-profiling.mjs';

test('parseArgs accepts --current-dir, --replace, and --all', () => {
  const args = parseArgs([
    '--pr',
    '1',
    '--run',
    '2',
    '--all',
    '--current-dir',
    './aggregated-reports',
    '--replace',
  ]);
  assert.equal(args.pr, '1');
  assert.equal(args.run, '2');
  assert.equal(args.all, true);
  assert.equal(args.currentDir, './aggregated-reports');
  assert.equal(args.replace, true);
});

test('parseDeviceKey parses Name+OSVersion keys', () => {
  assert.deepEqual(parseDeviceKey('Google Pixel 8 Pro+14.0'), {
    name: 'Google Pixel 8 Pro',
    osVersion: '14.0',
  });
});

test('parseDeviceKey accepts device objects', () => {
  assert.deepEqual(parseDeviceKey({ name: 'iPhone 15', osVersion: '17.0' }), {
    name: 'iPhone 15',
    osVersion: '17.0',
  });
});

test('devicesMatch matches on name and os version', () => {
  assert.equal(
    devicesMatch(
      { name: 'Pixel 8', osVersion: '14.0' },
      { name: 'Pixel 8', osVersion: '14.0' },
    ),
    true,
  );
});

test('devicesMatch rejects different devices', () => {
  assert.equal(
    devicesMatch(
      { name: 'Pixel 8', osVersion: '14.0' },
      { name: 'Pixel 7', osVersion: '14.0' },
    ),
    false,
  );
});

test('isScenarioGreen returns false for failed tests', () => {
  assert.equal(isScenarioGreen({ testFailed: true }), false);
});

test('isScenarioGreen returns false when quality gates failed', () => {
  assert.equal(
    isScenarioGreen({
      testFailed: false,
      qualityGates: { hasThresholds: true, passed: false },
    }),
    false,
  );
});

test('isScenarioGreen returns true for passed tests', () => {
  assert.equal(
    isScenarioGreen({
      testFailed: false,
      qualityGates: { hasThresholds: true, passed: true },
    }),
    true,
  );
});

test('computeDelta flags regressions above the 10% margin', () => {
  const delta = computeDelta(10, 12);
  assert.equal(delta.absolute, 2);
  assert.equal(delta.relative, 0.2);
  assert.equal(delta.warn, true);
});

test('computeDelta does not warn within the baseline + 10% margin', () => {
  assert.equal(computeDelta(10, 10.5).warn, false); // +5%
  assert.equal(computeDelta(10, 11).warn, false); // exactly +10%
});

test('computeDelta does not warn for improvements', () => {
  const delta = computeDelta(10, 8);
  assert.equal(delta.warn, false);
});

test('getMetricRows highlights current and percent when over margin', () => {
  const rows = getMetricRows(
    {
      cpu: { avg: 10, max: 20 },
      memory: { avg: 100, max: 120 },
      uiRendering: { slowFrames: 1, frozenFrames: 0, anrs: 0 },
      issues: 0,
      criticalIssues: 0,
    },
    {
      cpu: { avg: 15, max: 25 },
      memory: { avg: 105, max: 130 },
      uiRendering: { slowFrames: 2, frozenFrames: 1, anrs: 1 },
      issues: 2,
      criticalIssues: 1,
    },
  );

  const cpuAvg = rows.find((row) => row.label === 'CPU avg');
  assert.equal(cpuAvg?.warn, true);
  assert.match(cpuAvg?.currentText ?? '', /^\*\*.*\*\*$/);
  assert.match(cpuAvg?.deltaText ?? '', /\*\*.*%\*\*/);
  assert.match(cpuAvg?.deltaText ?? '', /⚠️/);

  const memoryAvg = rows.find((row) => row.label === 'Memory avg');
  // +5% stays within the allowed margin
  assert.equal(memoryAvg?.warn, false);
  assert.equal(memoryAvg?.currentText?.includes('**'), false);
});

test('hasUsableProfilingSummary rejects error payloads', () => {
  assert.equal(
    hasUsableProfilingSummary({
      profilingSummary: { error: 'No profiling data available' },
    }),
    false,
  );
});

test('findMatchingArtifact matches by test name and device', () => {
  const artifacts = [
    {
      path: '/tmp/a.json',
      data: {
        testName: 'Cold Start Login',
        device: { name: 'Pixel 8', osVersion: '14.0' },
        profilingSummary: { cpu: { avg: 1, max: 2 } },
      },
    },
  ];

  const match = findMatchingArtifact(artifacts, {
    testName: 'Cold Start Login',
    device: { name: 'Pixel 8', osVersion: '14.0' },
  });
  assert.equal(match?.data.testName, 'Cold Start Login');
});

test('buildScenarioComment includes marker and delta table when baseline exists', () => {
  const md = buildScenarioComment({
    testName: 'Cold Start Login',
    platform: 'Android',
    device: { name: 'Pixel 8', osVersion: '14.0' },
    currentRunId: '111',
    currentArtifact: {
      profilingSummary: {
        cpu: { avg: 20, max: 40 },
        memory: { avg: 200, max: 250 },
        uiRendering: { slowFrames: 2, frozenFrames: 0, anrs: 0 },
        issues: 1,
        criticalIssues: 0,
      },
    },
    baseline: {
      run: {
        databaseId: 222,
        headSha: 'abcdef123456',
        url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/222',
      },
      artifact: {
        profilingSummary: {
          cpu: { avg: 10, max: 20 },
          memory: { avg: 180, max: 220 },
          uiRendering: { slowFrames: 1, frozenFrames: 0, anrs: 0 },
          issues: 0,
          criticalIssues: 0,
        },
      },
    },
    repo: 'MetaMask/metamask-mobile',
    baselineBranch: 'main',
  });

  assert.match(md, /## 🔬 App Profiling Check: Cold Start Login/);
  assert.match(md, /\*\*Summary:\*\*/);
  assert.match(md, /metric/);
  assert.match(md, /<details>/);
  assert.match(md, /Full metric table/);
  assert.match(md, /\| Metric \| Baseline \| Current \| Δ \|/);
  assert.match(md, /Disclaimer — allowed variance/);
  assert.match(md, /\+10%/);
  assert.match(md, /Raw profilingSummary JSON/);
  assert.match(md, new RegExp(COMMENT_MARKER));
  assert.match(md, /run 222/);
});

test('buildRegressionSummary lists only warned metrics', () => {
  const summary = buildRegressionSummary([
    { label: 'CPU avg', warn: true, deltaText: '+2 (**+20%**) ⚠️' },
    { label: 'Memory avg', warn: false, deltaText: '+1 (+1%)' },
  ]);
  assert.match(summary, /CPU avg/);
  assert.match(summary, /\+20%/);
  assert.equal(summary.includes('Memory avg'), false);
});

test('buildScenarioComment explains missing baseline', () => {
  const md = buildScenarioComment({
    testName: 'Cold Start Login',
    platform: 'Android',
    device: { name: 'Pixel 8', osVersion: '14.0' },
    currentRunId: '111',
    currentArtifact: {
      profilingSummary: { cpu: { avg: 10, max: 20 } },
    },
    baseline: null,
    repo: 'MetaMask/metamask-mobile',
  });

  assert.match(md, /Skipping scenario/);
  assert.match(md, new RegExp(COMMENT_MARKER));
});

test('buildEmbeddedProfilingSection returns null without baseline', () => {
  assert.equal(
    buildEmbeddedProfilingSection({
      currentRunId: '111',
      currentArtifact: { profilingSummary: { cpu: { avg: 1 } } },
      baseline: null,
      repo: 'MetaMask/metamask-mobile',
    }),
    null,
  );
});

test('buildEmbeddedProfilingSection returns compact summary and collapsed table', () => {
  const md = buildEmbeddedProfilingSection({
    currentRunId: '111',
    currentArtifact: {
      profilingSummary: {
        cpu: { avg: 20, max: 40 },
        memory: { avg: 200, max: 250 },
        uiRendering: { slowFrames: 2, frozenFrames: 0, anrs: 0 },
        issues: 1,
        criticalIssues: 0,
      },
    },
    baseline: {
      isGreen: true,
      run: {
        databaseId: 222,
        headSha: 'abcdef123456',
        url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/222',
      },
      artifact: {
        profilingSummary: {
          cpu: { avg: 10, max: 20 },
          memory: { avg: 180, max: 220 },
          uiRendering: { slowFrames: 1, frozenFrames: 0, anrs: 0 },
          issues: 0,
          criticalIssues: 0,
        },
      },
    },
    repo: 'MetaMask/metamask-mobile',
  });

  assert.match(md, /App profiling check/);
  assert.match(md, /\*\*Summary:\*\*/);
  assert.match(md, /Full metric table/);
  assert.match(md, /\| Metric \| Baseline \| Current \| Δ \|/);
  assert.equal(md.includes('Raw profilingSummary JSON'), false);
});

test('buildEmbeddedProfilingSection labels non-green baseline fallback', () => {
  const md = buildEmbeddedProfilingSection({
    currentRunId: '111',
    currentArtifact: {
      profilingSummary: {
        cpu: { avg: 10, max: 20 },
        memory: { avg: 200, max: 250 },
        uiRendering: { slowFrames: 10, frozenFrames: 0, anrs: 0 },
        issues: 1,
        criticalIssues: 0,
      },
    },
    baseline: {
      isGreen: false,
      run: {
        databaseId: 222,
        headSha: 'abcdef123456',
        url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/222',
      },
      artifact: {
        profilingSummary: {
          cpu: { avg: 8, max: 18 },
          memory: { avg: 190, max: 240 },
          uiRendering: { slowFrames: 7, frozenFrames: 0, anrs: 0 },
          issues: 1,
          criticalIssues: 0,
        },
      },
    },
    repo: 'MetaMask/metamask-mobile',
  });

  assert.match(md, /scenario also failing/);
  assert.match(md, /No green baseline on `main`/);
  assert.match(md, /\*\*Summary:\*\*/);
  assert.match(md, /Full metric table/);
});

test('shouldIncludeScenarioInComment requires baseline and usable current', () => {
  assert.equal(
    shouldIncludeScenarioInComment({
      currentArtifact: { profilingSummary: { cpu: { avg: 1 } } },
      baseline: null,
    }),
    false,
  );
  assert.equal(
    shouldIncludeScenarioInComment({
      currentArtifact: { profilingSummary: { error: 'missing' } },
      baseline: { artifact: { profilingSummary: { cpu: { avg: 1 } } } },
    }),
    false,
  );
  assert.equal(
    shouldIncludeScenarioInComment({
      currentArtifact: { profilingSummary: { cpu: { avg: 1 } } },
      baseline: { artifact: { profilingSummary: { cpu: { avg: 1 } } } },
    }),
    true,
  );
});

test('buildScenarioComment labels non-green baseline fallback', () => {
  const md = buildScenarioComment({
    testName: 'Import SRP with +50 accounts',
    platform: 'Android',
    device: { name: 'Pixel 8', osVersion: '14.0' },
    currentRunId: '111',
    currentArtifact: {
      profilingSummary: {
        cpu: { avg: 10, max: 20 },
        memory: { avg: 200, max: 250 },
        uiRendering: { slowFrames: 10, frozenFrames: 0, anrs: 0 },
        issues: 1,
        criticalIssues: 0,
      },
    },
    baseline: {
      isGreen: false,
      run: {
        databaseId: 222,
        headSha: 'abcdef123456',
        url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/222',
      },
      artifact: {
        profilingSummary: {
          cpu: { avg: 8, max: 18 },
          memory: { avg: 190, max: 240 },
          uiRendering: { slowFrames: 7, frozenFrames: 0, anrs: 0 },
          issues: 1,
          criticalIssues: 0,
        },
      },
    },
    repo: 'MetaMask/metamask-mobile',
  });

  assert.match(md, /scenario also failing/);
  assert.match(md, /No green baseline on `main`/);
  assert.match(md, /\*\*Summary:\*\*/);
  assert.match(md, /Full metric table/);
  assert.match(md, /\| Metric \| Baseline \| Current \| Δ \|/);
});

test('downloadAggregatedReports reuses an existing baseline directory', async () => {
  const { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } =
    await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { downloadAggregatedReports } = await import('./diff-app-profiling.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'profiling-reuse-'));
  const resultsPath = join(dir, 'performance-results.json');
  const payload = JSON.stringify({ ok: true });
  try {
    writeFileSync(resultsPath, payload);

    let ghCalls = 0;
    const result = downloadAggregatedReports(123, dir, 'MetaMask/metamask-mobile', {
      runGhFn: () => {
        ghCalls += 1;
        throw new Error('gh should not be called when reusing');
      },
    });

    assert.equal(result.reused, true);
    assert.equal(ghCalls, 0);
    assert.equal(existsSync(resultsPath), true);
    assert.equal(readFileSync(resultsPath, 'utf8'), payload);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('downloadAggregatedReports downloads when directory is empty', async () => {
  const { mkdtempSync, writeFileSync, rmSync, existsSync } = await import(
    'node:fs'
  );
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { downloadAggregatedReports } = await import('./diff-app-profiling.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'profiling-download-'));
  try {
    let seenArgs = null;
    const result = downloadAggregatedReports(456, dir, 'MetaMask/metamask-mobile', {
      runGhFn: (args) => {
        seenArgs = args;
        // Simulate gh extracting the artifact into destDir.
        writeFileSync(
          join(dir, 'performance-results.json'),
          JSON.stringify({ downloaded: true }),
        );
      },
    });

    assert.equal(result.reused, false);
    assert.deepEqual(seenArgs, [
      'run',
      'download',
      '456',
      '--repo',
      'MetaMask/metamask-mobile',
      '-n',
      'aggregated-reports',
      '-D',
      dir,
    ]);
    assert.equal(existsSync(join(dir, 'performance-results.json')), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findScenarioWithProfilingInDir can use failed scenarios with profiling', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { findScenarioWithProfilingInDir } = await import(
    './diff-app-profiling.mjs'
  );

  const dir = mkdtempSync(join(tmpdir(), 'profiling-failed-baseline-'));
  try {
    writeFileSync(
      join(dir, 'performance-results.json'),
      JSON.stringify({
        Android: {
          'Pixel 8+14.0': [
            {
              testName: 'Import SRP',
              testFailed: true,
              failureReason: 'failed',
              device: { name: 'Pixel 8', osVersion: '14.0' },
              profilingSummary: { cpu: { avg: 5, max: 12 }, issues: 1 },
            },
          ],
        },
      }),
    );

    const greenOnly = findScenarioWithProfilingInDir(dir, {
      testName: 'Import SRP',
      device: { name: 'Pixel 8', osVersion: '14.0' },
      requireGreen: true,
    });
    assert.equal(greenOnly, null);

    const any = findScenarioWithProfilingInDir(dir, {
      testName: 'Import SRP',
      device: { name: 'Pixel 8', osVersion: '14.0' },
      requireGreen: false,
    });
    assert.equal(any?.isGreen, false);
    assert.equal(any?.artifact?.profilingSummary?.cpu?.avg, 5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findGreenScenarioInDir falls back to embedded profilingSummary', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { findGreenScenarioInDir } = await import('./diff-app-profiling.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'profiling-baseline-'));
  try {
    writeFileSync(
      join(dir, 'performance-results.json'),
      JSON.stringify({
        Android: {
          'Pixel 8+14.0': [
            {
              testName: 'Asset View',
              testFailed: false,
              device: { name: 'Pixel 8', osVersion: '14.0' },
              profilingSummary: { cpu: { avg: 11, max: 22 }, issues: 0 },
            },
          ],
        },
      }),
    );

    const found = findGreenScenarioInDir(dir, {
      testName: 'Asset View',
      device: { name: 'Pixel 8', osVersion: '14.0' },
    });
    assert.equal(found?.artifact?.profilingSummary?.cpu?.avg, 11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
