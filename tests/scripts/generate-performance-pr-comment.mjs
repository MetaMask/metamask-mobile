#!/usr/bin/env node

/**
 * Generate a GitHub PR comment with performance test results.
 *
 * Usage:
 *   node tests/scripts/generate-performance-pr-comment.mjs [summary_file] [output_file]
 */

import fs from 'fs';

const SUMMARY_FILE = process.argv[2] || 'aggregated-reports/summary.json';
const OUTPUT_FILE = process.argv[3] || 'performance-pr-comment.md';

if (!fs.existsSync(SUMMARY_FILE)) {
  console.log(`No summary file found at ${SUMMARY_FILE}; writing fallback comment`);
  fs.writeFileSync(
    OUTPUT_FILE,
    '⚠️ Performance test results are not available for this run.',
  );
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));

const totalTests = summary.uniqueTests ?? summary.totalTests ?? 0;
const testResults = summary.testResults ?? [];
const passedTests = testResults.filter((test) => test.status === 'passed');
const failedTests = testResults.filter((test) => test.status === 'failed');
const androidDevices = summary.platformDevices?.Android ?? [];
const iosDevices = summary.platformDevices?.iOS ?? [];
const totalDevices = androidDevices.length + iosDevices.length;
const buildType = summary.buildType ?? summary.metadata?.buildType ?? 'Normal';
const branch = summary.branch ?? summary.metadata?.branch ?? 'unknown';
const commit = (summary.commit ?? summary.metadata?.commit ?? 'unknown').slice(0, 7);
const runId = summary.metadata?.workflowRun ?? process.env.GITHUB_RUN_ID ?? '';
const repo = process.env.GITHUB_REPOSITORY ?? '';
const uniqueFailedTests =
  summary.failedTestsStats?.uniqueFailedTests ?? failedTests.length;
const overallPassed = uniqueFailedTests === 0 && !summary.error && !summary.warning;

function formatDevice(key) {
  if (!key) return '—';
  const lastPlus = String(key).lastIndexOf('+');
  if (lastPlus !== -1) {
    const name = String(key).slice(0, lastPlus);
    const version = String(key).slice(lastPlus + 1);
    return `${name} (v${version})`;
  }
  return String(key);
}

function formatDuration(duration) {
  if (typeof duration !== 'number') return '—';
  if (duration < 1000) return `${duration.toFixed(0)}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

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
      return reason ?? '—';
  }
}

function escapeCell(value) {
  return String(value ?? '—')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}

function getTeam(test) {
  return test.team?.teamId ?? test.team?.name ?? '—';
}

function buildRows(tests) {
  return tests
    .map((test) => {
      const statusIcon = test.status === 'failed' ? '❌' : '✅';
      const statusText = test.status === 'failed' ? 'Failed' : 'Passed';
      const recording = test.recordingLink
        ? `[📹 Watch](${test.recordingLink})`
        : '—';

      const cells = [
        `${statusIcon}<br>${statusText}`,
        escapeCell(test.testName),
        escapeCell(test.platform),
        escapeCell(formatDevice(test.device)),
        escapeCell(formatDuration(test.duration)),
        escapeCell(formatReason(test.failureReason)),
        escapeCell(getTeam(test)),
        recording,
      ];

      return `| ${cells.join(' | ')} |`;
    })
    .join('\n');
}

function buildTable(tests) {
  if (tests.length === 0) {
    return '_No tests in this group._\n';
  }

  return [
    '| Status | Test | Platform | Device | Duration | Reason | Team | Recording |',
    '|--------|------|----------|--------|----------|--------|------|-----------|',
    buildRows(tests),
  ].join('\n');
}

let md = '';

md += '## ⚡ Performance Test Results\n\n';
md += '> ℹ️ Performance test results are currently non-blocking and will not block this PR.\n\n';

if (summary.warning || summary.error) {
  md += `⚠️ **Results incomplete** — ${summary.warning ?? summary.error}\n\n`;
} else if (overallPassed) {
  md += '✅ **All tests passed**';
  if (totalTests > 0) {
    md += ` · ${totalTests} tests · ${totalDevices} device${totalDevices !== 1 ? 's' : ''}`;
  }
  md += '\n\n';
} else {
  md += `❌ **${uniqueFailedTests} test${uniqueFailedTests !== 1 ? 's' : ''} failed**`;
  if (totalTests > 0) {
    md += ` · ${totalTests} tests · ${totalDevices} device${totalDevices !== 1 ? 's' : ''}`;
  }
  md += '\n\n';
}

if (totalDevices > 0) {
  md += `<details>\n<summary>📱 Devices tested (${totalDevices})</summary>\n\n`;
  if (androidDevices.length > 0) {
    md += `**Android:** ${androidDevices.map(formatDevice).join(', ')}\n\n`;
  }
  if (iosDevices.length > 0) {
    md += `**iOS:** ${iosDevices.map(formatDevice).join(', ')}\n\n`;
  }
  md += '</details>\n\n';
}

if (testResults.length > 0) {
  md += `<details>\n<summary>✅ Passed Tests (${passedTests.length})</summary>\n\n`;
  md += `${buildTable(passedTests)}\n\n`;
  md += '</details>\n\n';
}

if (failedTests.length > 0) {
  md += `<details open>\n<summary>❌ Failed Tests (${failedTests.length})</summary>\n\n`;
  md += `${buildTable(failedTests)}\n\n`;
  md += '</details>\n\n';
}

md += '---\n';
md += `**Branch:** \`${branch}\` · **Build:** ${buildType} · **Commit:** \`${commit}\``;
if (runId && repo) {
  md += ` · [View full run](https://github.com/${repo}/actions/runs/${runId})`;
}
md += '\n';

fs.writeFileSync(OUTPUT_FILE, md);
console.log(`PR comment written to ${OUTPUT_FILE}`);
