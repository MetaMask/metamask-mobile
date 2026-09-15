import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  parseArgs,
  resolveLatestRun,
  extractMetrics,
  extractDetectedIssues,
  summarizeApiCalls,
  detectHeuristicIssues,
  summarizeCpuProfile,
  matchCpuProfilesToScenario,
  compareMetrics,
  buildScenarioSnapshot,
  buildMarkdownReport,
  buildSlackMarkdown,
  loadAppProfilingArtifacts,
} from './analyze-app-profiling.mjs';

test('parseArgs reads run, scenario, skip-ai, and current-dir', () => {
  const args = parseArgs([
    '--run',
    '99',
    '--scenario',
    'Cold Start Login',
    '--current-dir',
    './aggregated-reports',
    '--skip-ai',
    '--any-run',
  ]);
  assert.equal(args.run, '99');
  assert.equal(args.scenario, 'Cold Start Login');
  assert.equal(args.currentDir, './aggregated-reports');
  assert.equal(args.skipAi, true);
  assert.equal(args.scheduledOnly, false);
});

test('resolveLatestRun prefers a successful scheduled run', () => {
  const latest = resolveLatestRun(
    [
      {
        databaseId: 1,
        event: 'workflow_dispatch',
        conclusion: 'success',
        status: 'completed',
      },
      {
        databaseId: 2,
        event: 'schedule',
        conclusion: 'success',
        status: 'completed',
      },
    ],
    { scheduledOnly: true },
  );
  assert.equal(latest.databaseId, 2);
});

test('extractMetrics and detected issues from an app-profiling artifact', () => {
  const metrics = extractMetrics({
    cpu: { avg: 12.345, max: 88.1 },
    memory: { avg: 512.2, max: 940.9 },
    uiRendering: { slowFrames: 31.2, frozenFrames: 1.5, anrs: 1 },
    issues: 2,
    criticalIssues: 1,
    appSizeMb: 320.44,
  });
  assert.equal(metrics.cpuAvg, 12.35);
  assert.equal(metrics.memMaxMb, 940.9);
  assert.equal(metrics.slowFramesPct, 31.2);
  assert.equal(metrics.anrs, 1);

  const detected = extractDetectedIssues({
    data: {
      'io.metamask': {
        detected_issues: [
          {
            type: 'cpu',
            title: 'High CPU',
            subtitle: 'Average above recommended',
            current: 42,
            unit: '%',
          },
        ],
      },
    },
  });
  assert.equal(detected.length, 1);
  assert.equal(detected[0].title, 'High CPU');
});

test('detectHeuristicIssues flags jank, memory, ANRs, and BrowserStack issues', () => {
  const findings = detectHeuristicIssues(
    {
      slowFramesPct: 31,
      memMaxMb: 950,
      cpuAvg: 12,
      cpuMax: 40,
      anrs: 1,
      frozenFramesPct: 2,
      criticalIssues: 1,
      issues: 2,
      error: null,
    },
    [],
  );
  const themes = findings.map((finding) => finding.theme);
  assert.ok(themes.includes('ui-jank'));
  assert.ok(themes.includes('memory'));
  assert.ok(themes.includes('anr'));
  assert.ok(themes.includes('frozen-frames'));
  assert.ok(themes.includes('browserstack-critical'));
  assert.equal(findings.find((finding) => finding.theme === 'ui-jank').severity, 'high');
});

test('summarizeCpuProfile ranks hot frames by hitCount', () => {
  const summary = summarizeCpuProfile({
    startTime: 0,
    endTime: 2_000_000,
    samples: [1, 2, 2],
    nodes: [
      {
        id: 1,
        hitCount: 10,
        callFrame: { functionName: 'idle', url: 'native', lineNumber: 0 },
      },
      {
        id: 2,
        hitCount: 90,
        callFrame: {
          functionName: 'selectAccounts',
          url: 'app/selectors/accounts.ts',
          lineNumber: 40,
        },
      },
    ],
  });
  assert.equal(summary.totalHits, 100);
  assert.equal(summary.topFunctions[0].name, 'selectAccounts');
  assert.equal(summary.topFunctions[0].sharePct, 90);
  assert.equal(summary.durationMs, 2000);
});

test('matchCpuProfilesToScenario uses sanitized title', () => {
  const matches = matchCpuProfilesToScenario('Cold Start Login', 'browserstack-android', [
    { fileName: 'browserstack-android-Cold_Start_Login.cpuprofile' },
    { fileName: 'browserstack-android-Warm_Start.cpuprofile' },
  ]);
  assert.equal(matches.length, 1);
  assert.match(matches[0].fileName, /Cold_Start_Login/);
});

test('compareMetrics reports deltas against a baseline', () => {
  const delta = compareMetrics(
    { cpuAvg: 20, memMaxMb: 900, slowFramesPct: 30 },
    { cpuAvg: 10, memMaxMb: 800, slowFramesPct: 12 },
  );
  assert.equal(delta.cpuAvg.delta, 10);
  assert.equal(delta.slowFramesPct.delta, 18);
});

test('summarizeApiCalls keeps the slowest calls', () => {
  const summary = summarizeApiCalls([
    { method: 'GET', url: '/fast', status: 200, time: 20 },
    { method: 'GET', url: '/slow', status: 200, time: 900 },
    { method: 'POST', url: '/fail', status: 500, time: 100 },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.slowest[0].url, '/slow');
  assert.equal(summary.errorStatus[0].status, 500);
});

test('loadAppProfilingArtifacts and buildScenarioSnapshot produce findings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-profiling-'));
  const profilingDir = path.join(dir, 'app-profiling');
  fs.mkdirSync(profilingDir);
  fs.writeFileSync(
    path.join(profilingDir, 'app-profiling-Cold_Start_Login-Pixel-14.json'),
    JSON.stringify({
      testName: 'Cold Start Login',
      projectName: 'browserstack-android',
      sessionId: 'abc',
      videoURL: 'https://example.com/video',
      device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
      timestamp: '2026-09-15T00:00:00.000Z',
      profilingSummary: {
        cpu: { avg: 41, max: 90 },
        memory: { avg: 600, max: 910 },
        uiRendering: { slowFrames: 28, frozenFrames: 0, anrs: 0 },
        issues: 1,
        criticalIssues: 0,
      },
      profilingData: { data: { 'io.metamask': { detected_issues: [] } } },
      apiCalls: [],
    }),
  );

  const artifacts = loadAppProfilingArtifacts(dir, null);
  assert.equal(artifacts.length, 1);
  const snapshot = buildScenarioSnapshot({
    artifact: artifacts[0],
    cpuSummaries: [
      {
        fileName: 'browserstack-android-Cold_Start_Login.cpuprofile',
        skipped: false,
        topFunctions: [
          { name: 'hotFn', hitCount: 80, sharePct: 80, url: 'app/foo.ts' },
        ],
      },
    ],
    baselineMetrics: { cpuAvg: 10, memMaxMb: 700, slowFramesPct: 8 },
  });
  assert.equal(snapshot.testName, 'Cold Start Login');
  assert.ok(snapshot.heuristicFindings.some((finding) => finding.theme === 'cpu'));
  assert.ok(snapshot.heuristicFindings.some((finding) => finding.theme === 'hot-frame'));
  assert.equal(snapshot.cpuProfiles.length, 1);
  assert.equal(snapshot.baselineDelta.cpuAvg.delta, 31);

  const markdown = buildMarkdownReport({
    meta: { runId: '1', runUrl: 'https://example.com/run', ai: false },
    scenarios: [snapshot],
    aiAnalysis: null,
  });
  assert.match(markdown, /Cold Start Login/);
  assert.match(markdown, /Heuristic highlights/);

  const slack = buildSlackMarkdown({
    meta: { runId: '1' },
    scenarios: [snapshot],
    aiAnalysis: null,
  });
  assert.match(slack, /Ad-hoc app profiling analysis/);
});
