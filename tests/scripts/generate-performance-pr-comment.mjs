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

const SUMMARY_FILE = process.argv[2] || 'aggregated-reports/summary.json';
const OUTPUT_FILE = process.argv[3] || 'performance-pr-comment.md';

if (!fs.existsSync(SUMMARY_FILE)) {
  console.log(`⚠️  No summary file found at ${SUMMARY_FILE} — skipping comment generation`);
  fs.writeFileSync(OUTPUT_FILE, '⚠️ Performance test results are not available for this run.');
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));

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
    case 'quality_gates_exceeded': return 'Quality gates exceeded';
    case 'timedOut':               return 'Timed out';
    case 'test_error':
    case 'failed':                 return 'Test error';
    default:                       return reason ?? 'Unknown';
  }
}

// ─── Build the comment ────────────────────────────────────────────────────────

let md = '';

// Title
md += `## ⚡ Performance Test Results\n\n`;

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
