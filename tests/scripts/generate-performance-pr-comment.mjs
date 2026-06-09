#!/usr/bin/env node

/**
 * Generate a GitHub PR comment with performance test results.
 *
 * Usage:
 *   node generate-performance-pr-comment.mjs [summary_file] [output_file]
 *
 * Defaults:
 *   summary_file = aggregated-reports/summary.json
 *   output_file  = performance-pr-comment.md
 *
 * Environment variables used for links:
 *   GITHUB_RUN_ID       - workflow run ID
 *   GITHUB_REPOSITORY   - owner/repo
 */

import fs from 'fs';
import path from 'path';

const SUMMARY_FILE = process.argv[2] || 'aggregated-reports/summary.json';
const OUTPUT_FILE = process.argv[3] || 'performance-pr-comment.md';

if (!fs.existsSync(SUMMARY_FILE)) {
  console.log(`⚠️  No summary file found at ${SUMMARY_FILE} — skipping comment generation`);
  fs.writeFileSync(OUTPUT_FILE, '⚠️ Performance test results are not available for this run.');
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
const resultsFile = path.join(path.dirname(SUMMARY_FILE), 'performance-results.json');
const performanceResults = fs.existsSync(resultsFile)
  ? JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
  : null;

const totalTests = summary.uniqueTests ?? summary.totalTests ?? 0;
const androidDevices = summary.platformDevices?.Android ?? [];
const iosDevices = summary.platformDevices?.iOS ?? [];
const totalDevices = androidDevices.length + iosDevices.length;
const buildType = summary.buildType ?? 'Normal';
const branch = summary.branch ?? 'unknown';
const commit = (summary.commit ?? 'unknown').slice(0, 7);
const runId = summary.metadata?.workflowRun ?? process.env.GITHUB_RUN_ID ?? '';
const repo = process.env.GITHUB_REPOSITORY ?? '';

const failedStats = summary.failedTestsStats ?? {};
const uniqueFailedTests = failedStats.uniqueFailedTests ?? 0;
const failedByTeam = failedStats.failedTestsByTeam ?? {};

const overallPassed = uniqueFailedTests === 0 && !summary.error && !summary.warning;

/** Convert "DeviceName+OSVersion" → "DeviceName (vOSVersion)" */
function formatDevice(key) {
  const lastPlus = key.lastIndexOf('+');
  if (lastPlus !== -1) {
    const name = key.slice(0, lastPlus);
    const ver = key.slice(lastPlus + 1);
    return `${name} (v${ver})`;
  }
  return key;
}

/** Map raw failureReason to a human-readable label */
function formatReason(reason) {
  switch (reason) {
    case 'quality_gates_exceeded':
      return 'Quality gates exceeded';
    case 'timedOut':
      return 'Timed out';
    case 'test_error':
    case 'failed':
      return 'Test error';
    default:
      return reason ?? 'Unknown';
  }
}

function escapeMarkdownTable(value) {
  return String(value ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function getDeviceKey(device) {
  if (!device) {
    return '';
  }

  if (typeof device === 'object') {
    return `${device.name ?? ''}+${device.osVersion ?? ''}`;
  }

  return String(device);
}

function getDeviceLabel(device, fallbackPlatform) {
  if (typeof device === 'object') {
    const name = device?.name ?? fallbackPlatform;
    const version = device?.osVersion ? ` (v${device.osVersion})` : '';
    return `${name}${version}`;
  }

  return device ? formatDevice(String(device)) : fallbackPlatform;
}

function getFailedTestKeys() {
  const failedTests = Object.values(failedByTeam).flatMap(
    (teamData) => teamData.tests ?? [],
  );
  const bySessionId = new Map();
  const byTestIdentity = new Map();

  for (const test of failedTests) {
    if (test.sessionId) {
      bySessionId.set(test.sessionId, test);
    }

    byTestIdentity.set(
      `${test.platform}|${getDeviceKey(test.device)}|${test.testName}`,
      test,
    );
  }

  return { bySessionId, byTestIdentity };
}

function getAllTestRuns() {
  if (!performanceResults) {
    return [];
  }

  const failedTestKeys = getFailedTestKeys();

  return Object.entries(performanceResults).flatMap(([platform, devices]) =>
    Object.entries(devices ?? {}).flatMap(([deviceKey, tests]) =>
      (tests ?? []).map((test) => {
        const failedTest =
          failedTestKeys.bySessionId.get(test.sessionId) ??
          failedTestKeys.byTestIdentity.get(
            `${platform}|${deviceKey}|${test.testName}`,
          );
        const qualityGatesFailed = test.qualityGates?.passed === false;
        const failed = Boolean(failedTest) || qualityGatesFailed;
        const duration =
          typeof test.totalTime === 'number' ? `${test.totalTime.toFixed(2)}s` : '—';

        return {
          passed: !failed,
          status: failed ? '❌ Failed' : '✅ Passed',
          testName: test.testName,
          platform,
          device: getDeviceLabel(test.device ?? deviceKey, platform),
          duration,
          reason: failed
            ? formatReason(
                failedTest?.failureReason ??
                  (qualityGatesFailed ? 'quality_gates_exceeded' : undefined),
              )
            : '—',
          team: test.team?.teamId ?? 'Unknown Team',
          recordingLink: test.videoURL ?? failedTest?.recordingLink,
        };
      }),
    ),
  );
}

// ─── Build the comment ────────────────────────────────────────────────────────

let md = '';

// Title
md += `## ⚡ Performance Test Results\n\n`;
md += `> ℹ️ Performance test results are currently non-blocking and will not block this PR.\n\n`;

// Overall status line
if (summary.warning || summary.error) {
  md += `⚠️ **Results incomplete** — ${summary.warning ?? summary.error}\n\n`;
} else if (overallPassed) {
  md += `✅ **All tests passed**`;
  if (totalTests > 0) md += ` · ${totalTests} tests · ${totalDevices} device${totalDevices !== 1 ? 's' : ''}`;
  md += '\n\n';
} else {
  md += `❌ **${uniqueFailedTests} test${uniqueFailedTests !== 1 ? 's' : ''} failed**`;
  if (totalTests > 0) md += ` · ${totalTests} tests · ${totalDevices} device${totalDevices !== 1 ? 's' : ''}`;
  md += '\n\n';
}

// Devices (collapsible)
if (totalDevices > 0) {
  md += `<details>\n<summary>📱 Devices tested (${totalDevices})</summary>\n\n`;
  if (androidDevices.length > 0) {
    md += `**Android:** ${androidDevices.map(formatDevice).join(', ')}\n\n`;
  }
  if (iosDevices.length > 0) {
    md += `**iOS:** ${iosDevices.map(formatDevice).join(', ')}\n\n`;
  }
  md += `</details>\n\n`;
}

const allTestRuns = getAllTestRuns();
const passedTestRuns = allTestRuns.filter((test) => test.passed);

// Failed tests table (one section per team)
if (uniqueFailedTests > 0) {
  md += `### ❌ Failed Tests (${uniqueFailedTests})\n\n`;

  for (const [, teamData] of Object.entries(failedByTeam)) {
    const teamName = teamData.team?.teamId ?? 'Unknown Team';
    const tests = teamData.tests ?? [];
    if (tests.length === 0) continue;

    md += `**${teamName}**\n\n`;
    md += `| Test | Platform | Device | Reason | Recording |\n`;
    md += `|------|----------|--------|--------|-----------|\n`;

    for (const t of tests) {
      const device =
        typeof t.device === 'object'
          ? (t.device?.name ?? t.platform)
          : (t.device ? formatDevice(String(t.device)) : t.platform);

      const reason = formatReason(t.failureReason);
      const recording = t.recordingLink ? `[📹 Watch](${t.recordingLink})` : '—';
      md += `| ${t.testName} | ${t.platform} | ${device} | ${reason} | ${recording} |\n`;
    }
    md += '\n';
  }
}

if (passedTestRuns.length > 0) {
  md += `<details>\n<summary>✅ Passed Tests (${passedTestRuns.length})</summary>\n\n`;
  md += `| Test | Platform | Device | Duration | Team | Recording |\n`;
  md += `|------|----------|--------|----------|------|-----------|\n`;

  for (const test of passedTestRuns) {
    const recording = test.recordingLink
      ? `[📹 Watch](${test.recordingLink})`
      : '—';

    md += `| ${escapeMarkdownTable(test.testName)} | ${
      test.platform
    } | ${escapeMarkdownTable(test.device)} | ${test.duration} | ${escapeMarkdownTable(
      test.team,
    )} | ${recording} |\n`;
  }

  md += `\n</details>\n\n`;
}

// Footer
md += `---\n`;
md += `**Branch:** \`${branch}\` · **Build:** ${buildType} · **Commit:** \`${commit}\``;
if (runId && repo) {
  md += ` · [View full run](https://github.com/${repo}/actions/runs/${runId})`;
}
md += '\n';

// Write output
fs.writeFileSync(OUTPUT_FILE, md);
console.log(`✅ PR comment written to ${OUTPUT_FILE}`);
