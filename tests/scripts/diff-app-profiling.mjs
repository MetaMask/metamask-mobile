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
 * From the performance workflow (local aggregated-reports already present):
 *   node tests/scripts/diff-app-profiling.mjs --pr 33656 --run 29931469755 --all \
 *     --current-dir aggregated-reports --replace
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
/** Current may be up to baseline + 10% without being highlighted as a regression. */
const RELATIVE_WARN_THRESHOLD = 0.1;

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
    /** When set, use this local aggregated-reports dir instead of downloading the current run. */
    currentDir: null,
    /** Delete previous app-profiling-check PR comments before posting a new one. */
    replace: false,
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
      case '--current-dir':
        args.currentDir = next;
        i += 1;
        break;
      case '--all':
        args.all = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--replace':
        args.replace = true;
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

function downloadAggregatedReports(runId, destDir, repo, { runGhFn = runGh } = {}) {
  const resultsPath = path.join(destDir, 'performance-results.json');
  // Reuse a prior download in this workRoot (common with --all when multiple
  // scenarios share the same baseline candidates). Re-extracting into a
  // non-empty dir fails with "file exists" and would skip a valid baseline.
  if (fs.existsSync(resultsPath)) {
    return { reused: true };
  }
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  runGhFn([
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
  return { reused: false };
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

function findScenarioWithProfilingInDir(
  dir,
  { testName, device, requireGreen = false },
) {
  const resultsPath = path.join(dir, 'performance-results.json');
  if (!fs.existsSync(resultsPath)) {
    return null;
  }
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const match = flattenPerformanceResults(results).find(
    (entry) =>
      entry.test.testName === testName &&
      devicesMatch(entry.device, device) &&
      (!requireGreen || isScenarioGreen(entry.test)),
  );
  if (!match) {
    return null;
  }

  const isGreen = isScenarioGreen(match.test);

  // Prefer dedicated app-profiling sidecars when present (new artifact layout).
  const artifacts = findProfilingArtifacts(dir);
  const sidecar = findMatchingArtifact(artifacts, { testName, device });
  if (sidecar && hasUsableProfilingSummary(sidecar.data)) {
    return {
      platform: match.platform,
      device: match.device,
      artifact: sidecar.data,
      isGreen,
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
    isGreen,
  };
}

/** @deprecated Prefer findScenarioWithProfilingInDir({ requireGreen: true }) */
function findGreenScenarioInDir(dir, { testName, device }) {
  return findScenarioWithProfilingInDir(dir, {
    testName,
    device,
    requireGreen: true,
  });
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

  const downloaded = [];

  for (const run of candidates) {
    if (String(run.databaseId) === String(currentRunId)) {
      continue;
    }
    // Prefer completed workflow runs. Per-scenario green is checked below;
    // performance can be non-blocking so workflow success ≠ scenario green.
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

    downloaded.push({ run, dest });

    const green = findScenarioWithProfilingInDir(dest, {
      testName,
      device,
      requireGreen: true,
    });
    if (green) {
      return {
        run,
        ...green,
        isGreen: true,
      };
    }
  }

  // Fallback: if the scenario is also failing on the baseline branch, still
  // compare against the latest usable profilingSummary so teams can see
  // whether the PR is worse/better than current main.
  for (const { run, dest } of downloaded) {
    const any = findScenarioWithProfilingInDir(dest, {
      testName,
      device,
      requireGreen: false,
    });
    if (any) {
      console.warn(
        `⚠️  No green baseline for "${testName}"; using latest usable profiling from run ${run.databaseId} (scenario also failing on ${baselineBranch})`,
      );
      return {
        run,
        ...any,
        isGreen: false,
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

function emphasize(text) {
  return `**${text}**`;
}

/**
 * Warn only when current exceeds the allowed margin: baseline + 10%.
 * Values within that band are treated as acceptable variance.
 */
function computeDelta(baseline, current) {
  if (typeof baseline !== 'number' || typeof current !== 'number') {
    return { absolute: null, relative: null, warn: false };
  }
  const absolute = round(current - baseline);
  const relative =
    baseline === 0
      ? current === 0
        ? 0
        : null
      : round((current - baseline) / Math.abs(baseline), 4);

  // Within margin when current <= baseline * 1.1 (relative <= 10%).
  // Any increase from a zero baseline is outside the margin.
  const warn =
    absolute > 0 &&
    (relative == null || relative > RELATIVE_WARN_THRESHOLD);

  return { absolute, relative, warn };
}

function formatDelta(delta) {
  if (delta.absolute == null) {
    return '—';
  }
  const sign = delta.absolute > 0 ? '+' : '';
  const absoluteText = `${sign}${delta.absolute}`;

  let relativeText = '';
  if (delta.relative != null) {
    const percentText = `${sign}${round(delta.relative * 100, 1)}%`;
    relativeText = ` (${delta.warn ? emphasize(percentText) : percentText})`;
  }

  const warnIcon = delta.warn ? ' ⚠️' : '';
  return `${absoluteText}${relativeText}${warnIcon}`;
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
    },
    {
      label: 'Issues',
      baseline: baselineSummary?.issues,
      current: currentSummary?.issues,
      unit: '',
    },
    {
      label: 'Critical issues',
      baseline: baselineSummary?.criticalIssues,
      current: currentSummary?.criticalIssues,
      unit: '',
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
    const currentText = formatNumber(round(row.current), row.unit);

    return {
      label: row.label,
      baselineText: formatNumber(round(row.baseline), row.unit),
      currentText: delta.warn ? emphasize(currentText) : currentText,
      deltaText: formatDelta(delta),
      warn: delta.warn,
    };
  });
}

function buildRegressionSummary(rows) {
  const warned = (rows ?? []).filter((row) => row.warn);
  if (warned.length === 0) {
    return '✅ No metrics over the +10% baseline margin.';
  }

  const list = warned
    .map((row) => {
      const delta = String(row.deltaText ?? '')
        .replaceAll('**', '')
        .replace(' ⚠️', '')
        .trim();
      return delta ? `${row.label} (${delta})` : row.label;
    })
    .join(', ');

  return `⚠️ **${warned.length}** metric${
    warned.length === 1 ? '' : 's'
  } over +10%: ${list}`;
}

function shouldIncludeScenarioInComment({ currentArtifact, baseline }) {
  // Without a prior baseline there is nothing useful to compare — omit the
  // scenario from the PR comment instead of posting a "no baseline" stub.
  return Boolean(
    baseline && currentArtifact && hasUsableProfilingSummary(currentArtifact),
  );
}

/**
 * Group network log entries by exact URL, highest count first.
 * @param {Array<{ url?: string }>|null|undefined} apiCalls
 * @returns {Array<{ url: string, count: number }>}
 */
function groupApiCallsByEndpoint(apiCalls) {
  if (!Array.isArray(apiCalls) || apiCalls.length === 0) {
    return [];
  }

  const counts = new Map();
  for (const entry of apiCalls) {
    const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
    if (!url) continue;
    counts.set(url, (counts.get(url) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count || a.url.localeCompare(b.url));
}

/**
 * Collapsed markdown details listing unique endpoints with call counts.
 * @param {Array<{ url?: string }>|null|undefined} apiCalls
 * @returns {string}
 */
function buildApiCallsDetails(apiCalls) {
  const grouped = groupApiCallsByEndpoint(apiCalls);
  if (grouped.length === 0) {
    return '';
  }

  const totalCalls = grouped.reduce((sum, item) => sum + item.count, 0);
  let md = `\n<details>\n<summary>API calls (${totalCalls})</summary>\n\n`;
  for (const { url, count } of grouped) {
    md += `- ${url} -> ${count}\n`;
  }
  md += `\n</details>\n`;
  return md;
}

/**
 * Compact profiling block for embedding under a failed performance test.
 * Returns null when there is no usable baseline comparison.
 */
function buildEmbeddedProfilingSection({
  currentRunId,
  currentArtifact,
  baseline,
  repo,
  baselineBranch = DEFAULT_BASELINE_BRANCH,
  includeRawJson = false,
}) {
  if (!shouldIncludeScenarioInComment({ currentArtifact, baseline })) {
    return null;
  }

  const currentUrl = `https://github.com/${repo}/actions/runs/${currentRunId}`;
  const baselineUrl =
    baseline.run.url ||
    `https://github.com/${repo}/actions/runs/${baseline.run.databaseId}`;
  const baselineSha = (baseline.run.headSha || '').slice(0, 7);
  const baselineKind =
    baseline.isGreen === false
      ? `last run on \`${baselineBranch}\` (scenario also failing)`
      : `last green on \`${baselineBranch}\``;

  const rows = getMetricRows(
    baseline.artifact.profilingSummary,
    currentArtifact.profilingSummary,
  );

  let md = `🔬 **App profiling check** · Current [run ${currentRunId}](${currentUrl}) · Baseline (${baselineKind}) [run ${baseline.run.databaseId}](${baselineUrl})`;
  if (baselineSha) {
    md += ` @ \`${baselineSha}\``;
  }
  md += '\n\n';

  if (baseline.isGreen === false) {
    md += `> ⚠️ No green baseline on \`${baselineBranch}\` — comparing against the latest usable profiling.\n\n`;
  }

  md += `**Summary:** ${buildRegressionSummary(rows)}\n`;

  if (currentArtifact.apiCallsError) {
    md += `\n> ℹ️ API calls unavailable: \`${currentArtifact.apiCallsError}\`\n`;
  }

  md += `\n<details>\n<summary>Full metric table (+10% variance rules)</summary>\n\n`;
  md += `> **Disclaimer — allowed variance:** a **+10%** margin over the baseline is permitted.\n`;
  md += `> - If \`Current <= Baseline + 10%\`, treated as acceptable noise.\n`;
  md += `> - If \`Current > Baseline + 10%\`, **Current** and **variance %** are highlighted with ⚠️.\n\n`;
  md += `| Metric | Baseline | Current | Δ |\n`;
  md += `|--------|----------|---------|---|\n`;
  for (const row of rows) {
    md += `| ${row.label} | ${row.baselineText} | ${row.currentText} | ${row.deltaText} |\n`;
  }
  md += `\n</details>\n`;

  md += buildApiCallsDetails(currentArtifact.apiCalls);

  if (includeRawJson) {
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
    md += `</details>\n`;
  }

  return md;
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

  if (!shouldIncludeScenarioInComment({ currentArtifact, baseline })) {
    md += `\n\n⚠️ Skipping scenario: need usable current profiling and a baseline on \`${baselineBranch}\`.\n`;
    md += `\n${COMMENT_MARKER}\n`;
    return md;
  }

  const baselineUrl =
    baseline.run.url ||
    `https://github.com/${repo}/actions/runs/${baseline.run.databaseId}`;
  const baselineSha = (baseline.run.headSha || '').slice(0, 7);
  const baselineKind =
    baseline.isGreen === false
      ? `last run on \`${baselineBranch}\` (scenario also failing)`
      : `last green on \`${baselineBranch}\``;
  md += ` · **Baseline (${baselineKind}):** [run ${baseline.run.databaseId}](${baselineUrl})`;
  if (baselineSha) {
    md += ` @ \`${baselineSha}\``;
  }
  md += '\n';

  const embedded = buildEmbeddedProfilingSection({
    currentRunId,
    currentArtifact,
    baseline,
    repo,
    baselineBranch,
    includeRawJson: true,
  });

  // Reuse summary + collapsed details from the embedded builder; drop its
  // leading "App profiling check · Current/Baseline" line (already above).
  const detailsOnly = embedded
    .replace(/^🔬 \*\*App profiling check\*\*[^\n]*\n\n/, '')
    .replace(/^\n+/, '\n');
  md += detailsOnly;
  md += `\n${COMMENT_MARKER}\n`;
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

function deletePreviousAppProfilingComments({ pr, repo }) {
  // Paginate: without --paginate gh only returns the first page (30 comments,
  // oldest-first), so recent <!-- app-profiling-check --> comments on busy PRs
  // would be missed and --replace would stack duplicates.
  const raw = runGh([
    'api',
    '--paginate',
    `repos/${repo}/issues/${pr}/comments?per_page=100`,
    '--jq',
    `.[] | select(.body | contains("${COMMENT_MARKER}")) | .id`,
  ]);
  const ids = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const id of ids) {
    try {
      runGh(['api', `repos/${repo}/issues/comments/${id}`, '--method', 'DELETE']);
      console.log(`🗑️  Deleted previous app profiling comment ${id}`);
    } catch (error) {
      console.warn(
        `⚠️  Could not delete comment ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.pr) fail('Missing --pr <number>');
  if (!args.run) fail('Missing --run <current_run_id>');
  if (!args.repo) fail('Missing --repo owner/repo or GITHUB_REPOSITORY');

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-profiling-check-'));
  let currentDir = args.currentDir;

  if (currentDir) {
    currentDir = path.resolve(currentDir);
    if (!fs.existsSync(currentDir)) {
      fail(`--current-dir does not exist: ${currentDir}`);
    }
    console.log(`📂 Using local aggregated-reports at ${currentDir}`);
  } else {
    currentDir = path.join(workRoot, 'current');
    console.log(
      `📥 Downloading current aggregated-reports from run ${args.run}...`,
    );
    downloadAggregatedReports(args.run, currentDir, args.repo);
  }

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

    if (!shouldIncludeScenarioInComment({ currentArtifact, baseline })) {
      console.warn(
        `⏭️  Skipping "${scenario.testName}" on ${formatDeviceLabel(
          scenario.device,
        )}: no usable current profiling and/or no prior baseline on ${args.baselineBranch}`,
      );
      continue;
    }

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

  if (comments.length === 0) {
    console.log(
      'ℹ️  No failed scenarios had both usable current profiling and a prior baseline — nothing to post',
    );
    if (args.replace && !args.dryRun) {
      console.log('🧹 Clearing previous app profiling check comments...');
      deletePreviousAppProfilingComments({ pr: args.pr, repo: args.repo });
    }
    return;
  }

  const body = comments.join('\n---\n\n');
  const bodyFile = path.join(workRoot, 'comment.md');
  fs.writeFileSync(bodyFile, body);

  if (args.dryRun) {
    console.log(body);
    console.log(`\n✅ Dry run complete. Comment written to ${bodyFile}`);
    return;
  }

  if (args.replace) {
    console.log('🧹 Replacing previous app profiling check comments...');
    deletePreviousAppProfilingComments({ pr: args.pr, repo: args.repo });
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
  findScenarioWithProfilingInDir,
  downloadAggregatedReports,
  buildRegressionSummary,
  buildEmbeddedProfilingSection,
  buildScenarioComment,
  shouldIncludeScenarioInComment,
  groupApiCallsByEndpoint,
  buildApiCallsDetails,
  findBaselineScenario,
  findProfilingArtifacts,
  parseArgs,
  COMMENT_MARKER,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
