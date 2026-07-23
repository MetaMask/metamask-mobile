#!/usr/bin/env node

/**
 * Diff app profiling for a performance scenario against the last green baseline.
 *
 * Usage:
 *   node tests/scripts/diff-app-profiling.mjs \
 *     --pr 33656 \
 *     --run 29931469755 \
 *     --test "Cold Start Login" \
 *     --platform Android \
 *     --device "Google Pixel 8 Pro+14.0"
 *
 * Or compare all failed tests from the current run:
 *   node tests/scripts/diff-app-profiling.mjs --pr 33656 --run 29931469755 --all
 *
 * Environment:
 *   GITHUB_REPOSITORY  owner/repo (required unless --repo is passed)
 *   GH_TOKEN / GITHUB_TOKEN  GitHub token with actions:read + pull_requests:write
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const COMMENT_MARKER = '<!-- app-profiling-check -->';
const DEFAULT_BASELINE_BRANCH = 'main';
const DEFAULT_WORKFLOW = 'run-performance-e2e.yml';
const RELATIVE_WARN_THRESHOLD = 0.1; // 10%

function parseArgs(argv) {
  const args = {
    pr: null,
    run: null,
    test: null,
    platform: null,
    device: null,
    all: false,
    baselineBranch: DEFAULT_BASELINE_BRANCH,
    workflow: DEFAULT_WORKFLOW,
    repo: process.env.GITHUB_REPOSITORY || null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--pr':
        args.pr = next;
        i += 1;
        break;
      case '--run':
        args.run = next;
        i += 1;
        break;
      case '--test':
        args.test = next;
        i += 1;
        break;
      case '--platform':
        args.platform = next;
        i += 1;
        break;
      case '--device':
        args.device = next;
        i += 1;
        break;
      case '--baseline-branch':
        args.baselineBranch = next;
        i += 1;
        break;
      case '--workflow':
        args.workflow = next;
        i += 1;
        break;
      case '--repo':
        args.repo = next;
        i += 1;
        break;
      case '--all':
        args.all = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        break;
    }
  }

  return args;
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGh(ghArgs, options = {}) {
  const env = {
    ...process.env,
    GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
  };
  const result = spawnSync('gh', ghArgs, {
    encoding: 'utf8',
    env,
    ...options,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(
      `gh ${ghArgs.join(' ')} failed: ${stderr || result.stdout || 'unknown error'}`,
    );
  }
  return (result.stdout || '').trim();
}

function parseDeviceKey(deviceKey) {
  if (!deviceKey) {
    return { name: null, osVersion: null };
  }
  if (typeof deviceKey === 'object') {
    return {
      name: deviceKey.name ?? null,
      osVersion: deviceKey.osVersion ?? null,
    };
  }
  const value = String(deviceKey);
  const lastPlus = value.lastIndexOf('+');
  if (lastPlus === -1) {
    return { name: value, osVersion: null };
  }
  return {
    name: value.slice(0, lastPlus),
    osVersion: value.slice(lastPlus + 1),
  };
}

function formatDeviceLabel(device) {
  if (!device?.name) {
    return 'Unknown device';
  }
  return device.osVersion ? `${device.name} (v${device.osVersion})` : device.name;
}

function devicesMatch(a, b) {
  if (!a?.name || !b?.name) {
    return false;
  }
  if (a.name !== b.name) {
    return false;
  }
  if (a.osVersion == null || b.osVersion == null) {
    return true;
  }
  return String(a.osVersion) === String(b.osVersion);
}

function isScenarioGreen(test) {
  if (!test || test.testFailed) {
    return false;
  }
  if (test.qualityGates?.hasThresholds && test.qualityGates.passed === false) {
    return false;
  }
  return true;
}

function findProfilingArtifacts(dir) {
  const profilingDir = path.join(dir, 'app-profiling');
  if (!fs.existsSync(profilingDir)) {
    return [];
  }
  return fs
    .readdirSync(profilingDir)
    .filter((name) => name.startsWith('app-profiling-') && name.endsWith('.json'))
    .map((name) => {
      const fullPath = path.join(profilingDir, name);
      try {
        return {
          path: fullPath,
          data: JSON.parse(fs.readFileSync(fullPath, 'utf8')),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function hasUsableProfilingSummary(artifact) {
  const summary = artifact?.profilingSummary;
  return Boolean(summary) && !summary.error;
}

function findMatchingArtifact(artifacts, { testName, device }) {
  return (
    artifacts.find(
      ({ data }) =>
        data.testName === testName && devicesMatch(data.device, device),
    ) ?? null
  );
}

function getFailedScenariosFromSummary(summaryDir) {
  const summaryPath = path.join(summaryDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    return [];
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const failedByTeam = summary.failedTestsStats?.failedTestsByTeam ?? {};
  const scenarios = [];

  for (const teamData of Object.values(failedByTeam)) {
    for (const test of teamData.tests ?? []) {
      const device = parseDeviceKey(test.device);
      scenarios.push({
        testName: test.testName,
        platform: test.platform ?? null,
        device,
      });
    }
  }
  return scenarios;
}

function downloadAggregatedReports(runId, destDir, repo) {
  fs.mkdirSync(destDir, { recursive: true });
  runGh([
    'run',
    'download',
    String(runId),
    '--repo',
    repo,
    '-n',
    'aggregated-reports',
    '-D',
    destDir,
  ]);
}

function listBaselineCandidateRuns({ repo, workflow, branch, limit = 40 }) {
  const raw = runGh([
    'run',
    'list',
    '--repo',
    repo,
    '--workflow',
    workflow,
    '--branch',
    branch,
    '--limit',
    String(limit),
    '--json',
    'databaseId,conclusion,createdAt,headSha,url,displayTitle',
  ]);
  return JSON.parse(raw || '[]');
}

function flattenPerformanceResults(results) {
  const entries = [];
  if (!results || typeof results !== 'object') {
    return entries;
  }

  for (const [platform, devices] of Object.entries(results)) {
    for (const [deviceKey, tests] of Object.entries(devices ?? {})) {
      for (const test of tests ?? []) {
        entries.push({
          platform,
          deviceKey,
          device: test.device ?? parseDeviceKey(deviceKey),
          test,
        });
      }
    }
  }
  return entries;
}

function findGreenScenarioInDir(dir, { testName, device }) {
  const resultsPath = path.join(dir, 'performance-results.json');
  if (!fs.existsSync(resultsPath)) {
    return null;
  }
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const match = flattenPerformanceResults(results).find(
    (entry) =>
      entry.test.testName === testName &&
      devicesMatch(entry.device, device) &&
      isScenarioGreen(entry.test),
  );
  if (!match) {
    return null;
  }

  // Prefer dedicated app-profiling sidecars when present (new artifact layout).
  const artifacts = findProfilingArtifacts(dir);
  const sidecar = findMatchingArtifact(artifacts, { testName, device });
  if (sidecar && hasUsableProfilingSummary(sidecar.data)) {
    return {
      platform: match.platform,
      device: match.device,
      artifact: sidecar.data,
    };
  }

  // Fallback for older aggregated-reports that only embed profiling on the
  // metrics entry inside performance-results.json (no app-profiling/ folder).
  const embeddedArtifact = {
    testName: match.test.testName,
    projectName: match.test.projectName ?? null,
    sessionId: match.test.sessionId ?? null,
    device: match.device,
    timestamp: match.test.timestamp ?? new Date().toISOString(),
    profilingSummary: match.test.profilingSummary ?? null,
    profilingData: match.test.profilingData ?? null,
    apiCalls: match.test.apiCalls ?? null,
    apiCallsError: match.test.apiCallsError ?? null,
  };
  if (!hasUsableProfilingSummary(embeddedArtifact)) {
    return null;
  }

  return {
    platform: match.platform,
    device: match.device,
    artifact: embeddedArtifact,
  };
}

function findBaselineScenario({
  repo,
  workflow,
  baselineBranch,
  currentRunId,
  testName,
  device,
  workRoot,
}) {
  const candidates = listBaselineCandidateRuns({
    repo,
    workflow,
    branch: baselineBranch,
  });

  for (const run of candidates) {
    if (String(run.databaseId) === String(currentRunId)) {
      continue;
    }
    // Prefer completed runs; performance can be non-blocking so conclusion
    // success still needs per-scenario green checks below.
    if (run.conclusion && run.conclusion !== 'success') {
      continue;
    }

    const dest = path.join(workRoot, `baseline-${run.databaseId}`);
    try {
      downloadAggregatedReports(run.databaseId, dest, repo);
    } catch (error) {
      console.warn(
        `⚠️  Skipping run ${run.databaseId}: could not download aggregated-reports (${error.message})`,
      );
      continue;
    }

    const found = findGreenScenarioInDir(dest, { testName, device });
    if (found) {
      return {
        run,
        ...found,
      };
    }
  }

  return null;
}

function round(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value, unit = '') {
  if (value == null) {
    return '—';
  }
  return `${value}${unit}`;
}

function computeDelta(baseline, current) {
  if (typeof baseline !== 'number' || typeof current !== 'number') {
    return { absolute: null, relative: null, warn: false };
  }
  const absolute = round(current - baseline);
  const relative =
    baseline === 0 ? (current === 0 ? 0 : null) : round((current - baseline) / Math.abs(baseline), 4);
  const warn =
    absolute > 0 &&
    (relative == null || Math.abs(relative) >= RELATIVE_WARN_THRESHOLD);
  return { absolute, relative, warn };
}

function formatDelta(delta) {
  if (delta.absolute == null) {
    return '—';
  }
  const sign = delta.absolute > 0 ? '+' : '';
  const relativeText =
    delta.relative == null
      ? ''
      : ` (${sign}${round(delta.relative * 100, 1)}%)`;
  const warn = delta.warn ? ' ⚠️' : '';
  return `${sign}${delta.absolute}${relativeText}${warn}`;
}

function getMetricRows(baselineSummary, currentSummary) {
  const rows = [
    {
      label: 'CPU avg',
      baseline: baselineSummary?.cpu?.avg,
      current: currentSummary?.cpu?.avg,
      unit: '%',
    },
    {
      label: 'CPU max',
      baseline: baselineSummary?.cpu?.max,
      current: currentSummary?.cpu?.max,
      unit: '%',
    },
    {
      label: 'Memory avg',
      baseline: baselineSummary?.memory?.avg,
      current: currentSummary?.memory?.avg,
      unit: ' MB',
    },
    {
      label: 'Memory max',
      baseline: baselineSummary?.memory?.max,
      current: currentSummary?.memory?.max,
      unit: ' MB',
    },
    {
      label: 'Slow frames',
      baseline: baselineSummary?.uiRendering?.slowFrames,
      current: currentSummary?.uiRendering?.slowFrames,
      unit: '%',
    },
    {
      label: 'Frozen frames',
      baseline: baselineSummary?.uiRendering?.frozenFrames,
      current: currentSummary?.uiRendering?.frozenFrames,
      unit: '%',
    },
    {
      label: 'ANRs',
      baseline: baselineSummary?.uiRendering?.anrs,
      current: currentSummary?.uiRendering?.anrs,
      unit: '',
      warnOnAnyIncrease: true,
    },
    {
      label: 'Issues',
      baseline: baselineSummary?.issues,
      current: currentSummary?.issues,
      unit: '',
      warnOnAnyIncrease: true,
    },
    {
      label: 'Critical issues',
      baseline: baselineSummary?.criticalIssues,
      current: currentSummary?.criticalIssues,
      unit: '',
      warnOnAnyIncrease: true,
    },
    {
      label: 'App size',
      baseline: baselineSummary?.appSizeMb,
      current: currentSummary?.appSizeMb,
      unit: ' MB',
    },
  ];

  return rows.map((row) => {
    const delta = computeDelta(row.baseline, row.current);
    if (
      row.warnOnAnyIncrease &&
      typeof row.baseline === 'number' &&
      typeof row.current === 'number' &&
      row.current > row.baseline
    ) {
      delta.warn = true;
    }
    return {
      label: row.label,
      baselineText: formatNumber(round(row.baseline), row.unit),
      currentText: formatNumber(round(row.current), row.unit),
      deltaText: formatDelta(delta),
      warn: delta.warn,
    };
  });
}

function buildScenarioComment({
  testName,
  platform,
  device,
  currentRunId,
  currentArtifact,
  baseline,
  repo,
  baselineBranch = DEFAULT_BASELINE_BRANCH,
}) {
  const deviceLabel = formatDeviceLabel(device);
  const currentUrl = `https://github.com/${repo}/actions/runs/${currentRunId}`;
  let md = `## 🔬 App Profiling Check: ${testName}\n\n`;
  md += `**Device:** ${deviceLabel}`;
  if (platform) {
    md += ` · **Platform:** ${platform}`;
  }
  md += '\n\n';
  md += `**Current:** [run ${currentRunId}](${currentUrl})`;

  if (!currentArtifact || !hasUsableProfilingSummary(currentArtifact)) {
    md += `\n\n⚠️ Current run has no usable \`profilingSummary\` for this scenario.\n`;
    if (currentArtifact?.apiCallsError) {
      md += `\nAPI calls note: \`${currentArtifact.apiCallsError}\`\n`;
    }
    md += `\n${COMMENT_MARKER}\n`;
    return md;
  }

  if (!baseline) {
    md += `\n\n⚠️ No green baseline found on \`${baselineBranch}\` (within recent \`aggregated-reports\` retention) for this scenario + device.\n\n`;
    md += `### Current profilingSummary\n\n`;
    md += '```json\n';
    md += `${JSON.stringify(currentArtifact.profilingSummary, null, 2)}\n`;
    md += '```\n';
    md += `\n${COMMENT_MARKER}\n`;
    return md;
  }

  const baselineUrl =
    baseline.run.url ||
    `https://github.com/${repo}/actions/runs/${baseline.run.databaseId}`;
  const baselineSha = (baseline.run.headSha || '').slice(0, 7);
  md += ` · **Baseline (last green on \`${baselineBranch}\`):** [run ${baseline.run.databaseId}](${baselineUrl})`;
  if (baselineSha) {
    md += ` @ \`${baselineSha}\``;
  }
  md += '\n\n';

  const rows = getMetricRows(
    baseline.artifact.profilingSummary,
    currentArtifact.profilingSummary,
  );

  md += `| Metric | Baseline | Current | Δ |\n`;
  md += `|--------|----------|---------|---|\n`;
  for (const row of rows) {
    md += `| ${row.label} | ${row.baselineText} | ${row.currentText} | ${row.deltaText} |\n`;
  }

  if (currentArtifact.apiCallsError) {
    md += `\n> ℹ️ API calls unavailable on current run: \`${currentArtifact.apiCallsError}\`\n`;
  }

  md += `\n<details>\n<summary>Raw profilingSummary JSON</summary>\n\n`;
  md += `**Baseline**\n\n\`\`\`json\n${JSON.stringify(
    baseline.artifact.profilingSummary,
    null,
    2,
  )}\n\`\`\`\n\n`;
  md += `**Current**\n\n\`\`\`json\n${JSON.stringify(
    currentArtifact.profilingSummary,
    null,
    2,
  )}\n\`\`\`\n\n`;
  md += `</details>\n\n`;
  md += `${COMMENT_MARKER}\n`;
  return md;
}

function resolveScenarios(args, currentDir) {
  if (args.all) {
    const failed = getFailedScenariosFromSummary(currentDir);
    if (failed.length === 0) {
      fail('No failed tests found in current summary.json to compare with --all');
    }
    return failed;
  }

  if (!args.test) {
    fail('Provide --test "Scenario name" or --all');
  }

  return [
    {
      testName: args.test,
      platform: args.platform,
      device: parseDeviceKey(args.device),
    },
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.pr) fail('Missing --pr <number>');
  if (!args.run) fail('Missing --run <current_run_id>');
  if (!args.repo) fail('Missing --repo owner/repo or GITHUB_REPOSITORY');

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-profiling-check-'));
  const currentDir = path.join(workRoot, 'current');

  console.log(`📥 Downloading current aggregated-reports from run ${args.run}...`);
  downloadAggregatedReports(args.run, currentDir, args.repo);

  const scenarios = resolveScenarios(args, currentDir);
  const currentArtifacts = findProfilingArtifacts(currentDir);
  const comments = [];

  for (const scenario of scenarios) {
    console.log(
      `🔬 Diffing "${scenario.testName}" on ${formatDeviceLabel(scenario.device)}...`,
    );

    let currentArtifact = findMatchingArtifact(currentArtifacts, scenario)?.data;
    if (!currentArtifact && !scenario.device.name) {
      // If device was not provided, take the first artifact with this test name.
      currentArtifact = currentArtifacts.find(
        ({ data }) => data.testName === scenario.testName,
      )?.data;
      if (currentArtifact?.device) {
        scenario.device = currentArtifact.device;
      }
    }

    const baseline = findBaselineScenario({
      repo: args.repo,
      workflow: args.workflow,
      baselineBranch: args.baselineBranch,
      currentRunId: args.run,
      testName: scenario.testName,
      device: scenario.device,
      workRoot,
    });

    comments.push(
      buildScenarioComment({
        testName: scenario.testName,
        platform: scenario.platform,
        device: scenario.device,
        currentRunId: args.run,
        currentArtifact,
        baseline,
        repo: args.repo,
        baselineBranch: args.baselineBranch,
      }),
    );
  }

  const body = comments.join('\n---\n\n');
  const bodyFile = path.join(workRoot, 'comment.md');
  fs.writeFileSync(bodyFile, body);

  if (args.dryRun) {
    console.log(body);
    console.log(`\n✅ Dry run complete. Comment written to ${bodyFile}`);
    return;
  }

  console.log(`💬 Posting comment on PR #${args.pr}...`);
  runGh(['pr', 'comment', String(args.pr), '--repo', args.repo, '--body-file', bodyFile]);
  console.log('✅ App profiling check comment posted');
}

// Exported for unit tests
export {
  parseDeviceKey,
  devicesMatch,
  isScenarioGreen,
  computeDelta,
  getMetricRows,
  hasUsableProfilingSummary,
  findMatchingArtifact,
  findGreenScenarioInDir,
  buildScenarioComment,
  COMMENT_MARKER,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
