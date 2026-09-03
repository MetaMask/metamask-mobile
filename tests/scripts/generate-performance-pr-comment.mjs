#!/usr/bin/env node

/**
 * Generate a GitHub PR comment with performance test results.
 *
 * Every scenario with a prior app-profiling baseline is enriched (short
 * summary + collapsed metric table) so a separate profiling comment is not
 * required: failed scenarios inline, passed scenarios in a collapsed section.
 *
 * Usage:
 *   node generate-performance-pr-comment.mjs [summary_file] [output_file]
 *
 * Defaults:
 *   summary_file = aggregated-reports/summary.json
 *   output_file  = performance-pr-comment.md
 *
 * Environment variables used for links / baseline lookup:
 *   GITHUB_RUN_ID       - workflow run ID
 *   GITHUB_REPOSITORY   - owner/repo
 *   GH_TOKEN / GITHUB_TOKEN - needed when enriching with baselines from main
 *   SKIP_APP_PROFILING_ENRICHMENT=true - skip baseline lookup (tests / offline)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  parseDeviceKey,
  findProfilingArtifacts,
  findMatchingArtifact,
  findBaselineScenario,
  buildEmbeddedProfilingSection,
  buildRegressionSummary,
  getMetricRows,
  hasUsableProfilingSummary,
  BASELINE_WORKFLOW,
  COMMENT_MARKER as APP_PROFILING_MARKER,
} from './diff-app-profiling.mjs';

const SUMMARY_FILE = process.argv[2] || 'aggregated-reports/summary.json';
const OUTPUT_FILE = process.argv[3] || 'performance-pr-comment.md';
const DEFAULT_BASELINE_BRANCH = 'main';
/** GitHub rejects issue comments over 65536 characters. */
const MAX_COMMENT_LENGTH = 60000;

async function main() {
  if (!fs.existsSync(SUMMARY_FILE)) {
    console.log(
      `⚠️  No summary file found at ${SUMMARY_FILE} — skipping comment generation`,
    );
    fs.writeFileSync(
      OUTPUT_FILE,
      '⚠️ Performance test results are not available for this run.',
    );
    return;
  }

  const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
  const reportsDir = path.dirname(SUMMARY_FILE);
  const resultsFile = path.join(reportsDir, 'performance-results.json');
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
  const runId =
    summary.metadata?.workflowRun ?? process.env.GITHUB_RUN_ID ?? '';
  const repo = process.env.GITHUB_REPOSITORY ?? '';

  const profilingStats = summary.profilingStats ?? null;
  const failedStats = summary.failedTestsStats ?? {};
  const uniqueFailedTests = failedStats.uniqueFailedTests ?? 0;
  const failedByTeam = failedStats.failedTestsByTeam ?? {};

  const overallPassed =
    uniqueFailedTests === 0 && !summary.error && !summary.warning;

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
            typeof test.totalTime === 'number'
              ? `${test.totalTime.toFixed(2)}s`
              : '—';

          return {
            key: `${platform}|${deviceKey}|${test.testName}`,
            passed: !failed,
            status: failed ? '❌ Failed' : '✅ Passed',
            testName: test.testName,
            platform,
            device: getDeviceLabel(test.device ?? deviceKey, platform),
            duration,
            reason: failed
              ? formatReason(
                  failedTest?.failureReason ??
                    (qualityGatesFailed
                      ? 'quality_gates_exceeded'
                      : undefined),
                )
              : '—',
            team: test.team?.teamId ?? 'Unknown Team',
            recordingLink: test.videoURL ?? failedTest?.recordingLink,
          };
        }),
      ),
    );
  }

  /**
   * Every scenario of the run, keyed the same way as the failed-test rows and
   * the passed-test rows so profiling blocks can be looked up while rendering.
   */
  function getScenariosToEnrich() {
    const scenarios = new Map();

    const add = ({ platform, device, testName }) => {
      const key = `${platform}|${getDeviceKey(device)}|${testName}`;
      if (!scenarios.has(key)) {
        scenarios.set(key, {
          key,
          platform,
          testName,
          device: parseDeviceKey(device),
        });
      }
    };

    for (const teamData of Object.values(failedByTeam)) {
      for (const test of teamData.tests ?? []) {
        add(test);
      }
    }

    for (const [platform, devices] of Object.entries(performanceResults ?? {})) {
      for (const [deviceKey, tests] of Object.entries(devices ?? {})) {
        for (const test of tests ?? []) {
          add({ platform, device: deviceKey, testName: test.testName });
        }
      }
    }

    return [...scenarios.values()];
  }

  const skipEnrichment =
    process.env.SKIP_APP_PROFILING_ENRICHMENT === 'true' || !repo || !runId;

  const profilingByKey = new Map();
  if (!skipEnrichment) {
    const workRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'perf-pr-profiling-'),
    );
    const currentArtifacts = findProfilingArtifacts(reportsDir);

    console.log(
      `🔬 Enriching scenarios with app profiling vs \`${DEFAULT_BASELINE_BRANCH}\`...`,
    );

    for (const scenario of getScenariosToEnrich()) {
      const { key, testName, device } = scenario;

      let currentArtifact = findMatchingArtifact(currentArtifacts, {
        testName,
        device,
      })?.data;

      if (!currentArtifact && !device.name) {
        currentArtifact = currentArtifacts.find(
          ({ data }) => data.testName === testName,
        )?.data;
      }

      if (!hasUsableProfilingSummary(currentArtifact)) {
        console.warn(
          `⏭️  No usable profiling for "${testName}" — omitting profiling block`,
        );
        continue;
      }

      try {
        const baseline = findBaselineScenario({
          repo,
          workflow: BASELINE_WORKFLOW,
          baselineBranch: DEFAULT_BASELINE_BRANCH,
          currentRunId: runId,
          testName,
          device: currentArtifact?.device ?? device,
          workRoot,
        });

        const section = buildEmbeddedProfilingSection({
          currentRunId: runId,
          currentArtifact,
          baseline,
          repo,
          baselineBranch: DEFAULT_BASELINE_BRANCH,
          includeRawJson: false,
        });

        if (section) {
          const rows = getMetricRows(
            baseline.artifact.profilingSummary,
            currentArtifact.profilingSummary,
          );
          profilingByKey.set(key, {
            section,
            summary: buildRegressionSummary(rows),
            hasRegression: rows.some((row) => row.warn),
          });
        } else {
          console.warn(
            `⏭️  No comparable baseline for "${testName}" — omitting profiling block`,
          );
        }
      } catch (error) {
        console.warn(
          `⚠️  Could not enrich "${testName}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // ─── Build the comment ────────────────────────────────────────────────────────

  let md = '';

  // Title — warn in the header when there are failed tests
  if (uniqueFailedTests > 0) {
    md += `## ⚠️ Performance Test Results\n\n`;
  } else {
    md += `## ⚡ Performance Test Results\n\n`;
  }
  md += `> ℹ️ Performance test results are currently non-blocking and will not block this PR.\n\n`;

  // Overall status line
  if (summary.warning || summary.error) {
    md += `⚠️ **Results incomplete** — ${summary.warning ?? summary.error}\n\n`;
  } else if (overallPassed) {
    md += `✅ **All tests passed**`;
    if (totalTests > 0)
      md += ` · ${totalTests} tests · ${totalDevices} device${
        totalDevices !== 1 ? 's' : ''
      }`;
    md += '\n\n';
  } else {
    md += `❌ **${uniqueFailedTests} test${
      uniqueFailedTests !== 1 ? 's' : ''
    } failed**`;
    if (totalTests > 0)
      md += ` · ${totalTests} tests · ${totalDevices} device${
        totalDevices !== 1 ? 's' : ''
      }`;
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

  // Failed tests — compact row + inline app profiling (when available)
  if (uniqueFailedTests > 0) {
    md += `### ❌ Failed Tests (${uniqueFailedTests})\n\n`;
    if (profilingByKey.size > 0) {
      md += `> 🔬 App profiling vs \`main\` is included under each failed scenario that has a prior baseline.\n\n`;
    }

    for (const [, teamData] of Object.entries(failedByTeam)) {
      const teamName = teamData.team?.teamId ?? 'Unknown Team';
      const tests = teamData.tests ?? [];
      if (tests.length === 0) continue;

      md += `**${teamName}**\n\n`;

      for (const t of tests) {
        const device =
          typeof t.device === 'object'
            ? t.device?.osVersion
              ? `${t.device.name} (v${t.device.osVersion})`
              : (t.device?.name ?? t.platform)
            : t.device
              ? formatDevice(String(t.device))
              : t.platform;

        const reason = formatReason(t.failureReason);
        const recording = t.recordingLink
          ? `[📹 Watch](${t.recordingLink})`
          : '—';
        const key = `${t.platform}|${getDeviceKey(t.device)}|${t.testName}`;
        const profiling = profilingByKey.get(key);

        md += `#### ${escapeMarkdownTable(t.testName)}\n\n`;
        md += `| Platform | Device | Reason | Recording |\n`;
        md += `|----------|--------|--------|-----------|\n`;
        md += `| ${escapeMarkdownTable(t.platform)} | ${escapeMarkdownTable(
          device,
        )} | ${escapeMarkdownTable(reason)} | ${recording} |\n\n`;

        if (profiling) {
          md += `${profiling.section}\n`;
        }
      }
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

  // App profiling for the passed scenarios, which have no inline block above.
  // Only regressions get the full metric table, to keep the comment well under
  // GitHub's 65k character limit as the number of scenarios grows.
  const passedWithProfiling = passedTestRuns
    .map((test) => ({ test, profiling: profilingByKey.get(test.key) }))
    .filter(({ profiling }) => profiling);

  if (profilingStats || passedWithProfiling.length > 0) {
    md += `<details>\n<summary>🔬 App profiling vs \`main\`${
      passedWithProfiling.length > 0
        ? ` (${passedWithProfiling.length} passed scenario${
            passedWithProfiling.length !== 1 ? 's' : ''
          })`
        : ''
    }</summary>\n\n`;

    if (profilingStats) {
      md += `**Coverage:** ${
        profilingStats.testsWithProfiling ?? 0
      }/${totalTests} scenarios (${profilingStats.profilingCoverage ?? '—'})`;
      md += ` · **Avg CPU:** ${profilingStats.avgCpuUsage ?? '—'}`;
      md += ` · **Avg memory:** ${profilingStats.avgMemoryUsage ?? '—'}`;
      md += ` · **Issues:** ${profilingStats.totalPerformanceIssues ?? 0} (${
        profilingStats.totalCriticalIssues ?? 0
      } critical)\n\n`;
    }

    if (passedWithProfiling.length > 0) {
      md += `| Test | Platform | Device | Profiling vs \`main\` |\n`;
      md += `|------|----------|--------|---------------------|\n`;

      for (const { test, profiling } of passedWithProfiling) {
        md += `| ${escapeMarkdownTable(test.testName)} | ${
          test.platform
        } | ${escapeMarkdownTable(test.device)} | ${escapeMarkdownTable(
          profiling.summary,
        )} |\n`;
      }

      md += '\n';

      let omittedTables = 0;

      for (const { test, profiling } of passedWithProfiling) {
        if (!profiling.hasRegression) {
          continue;
        }

        let block = `#### ${escapeMarkdownTable(test.testName)}\n\n`;
        block += `${test.platform} · ${escapeMarkdownTable(test.device)}\n\n`;
        block += `${profiling.section}\n`;

        if (md.length + block.length > MAX_COMMENT_LENGTH) {
          omittedTables += 1;
          continue;
        }

        md += block;
      }

      if (omittedTables > 0) {
        md += `> ℹ️ Metric tables for ${omittedTables} more scenario${
          omittedTables !== 1 ? 's' : ''
        } were omitted to stay within GitHub's comment size limit — full data is in the \`aggregated-reports\` artifact.\n\n`;
      }
    }

    md += `</details>\n\n`;
  }

  // Footer
  md += `---\n`;
  md += `**Branch:** \`${branch}\` · **Build:** ${buildType} · **Commit:** \`${commit}\``;
  if (runId && repo) {
    md += ` · [View full run](https://github.com/${repo}/actions/runs/${runId})`;
  }
  md += '\n';

  // Keep both markers so cleanup can find either legacy style.
  if (profilingByKey.size > 0) {
    md += `${APP_PROFILING_MARKER}\n`;
  }

  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`✅ PR comment written to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
