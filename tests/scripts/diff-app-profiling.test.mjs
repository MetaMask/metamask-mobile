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
  COMMENT_MARKER,
} from './diff-app-profiling.mjs';

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

test('computeDelta flags relative regressions above threshold', () => {
  const delta = computeDelta(10, 12);
  assert.equal(delta.absolute, 2);
  assert.equal(delta.relative, 0.2);
  assert.equal(delta.warn, true);
});

test('computeDelta does not warn for improvements', () => {
  const delta = computeDelta(10, 8);
  assert.equal(delta.warn, false);
});

test('getMetricRows warns on ANR increases', () => {
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
      memory: { avg: 110, max: 130 },
      uiRendering: { slowFrames: 2, frozenFrames: 1, anrs: 1 },
      issues: 2,
      criticalIssues: 1,
    },
  );

  const anrs = rows.find((row) => row.label === 'ANRs');
  assert.equal(anrs?.warn, true);
  assert.match(anrs?.deltaText ?? '', /⚠️/);
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
  assert.match(md, /\| Metric \| Baseline \| Current \| Δ \|/);
  assert.match(md, new RegExp(COMMENT_MARKER));
  assert.match(md, /run 222/);
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

  assert.match(md, /No green baseline found/);
  assert.match(md, new RegExp(COMMENT_MARKER));
});
