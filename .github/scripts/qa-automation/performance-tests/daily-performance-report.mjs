#!/usr/bin/env node

/**
 * Daily performance test report.
 *
 * Reads scheduled MetaMask Mobile performance E2E runs from the last 24 hours
 * and the previous 24 hours, then writes a Slack report with:
 * - a summary versus the previous window
 * - test errors
 * - stability (stable, passed on retry, flaky, failing)
 * - duration and fail-rate trends
 *
 * Usage:
 *   node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs
 *   node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs --hours 24 --out-dir /tmp/daily-performance
 *
 * Requirements:
 *   - `gh` authenticated with actions:read
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describeFailure } from './perf-comment-details.mjs';

const DEFAULT_REPO = 'MetaMask/metamask-mobile';
const DEFAULT_WORKFLOW = 'run-performance-e2e-manual.yml';
const DEFAULT_HOURS = 24;
const DEFAULT_BRANCH = 'main';
const DEFAULT_EVENT = 'schedule';
const MADRID_TZ = 'Europe/Madrid';
const DURATION_MOVE_PCT = 15;
const MAX_ERROR_ROWS = 20;
const MAX_TREND_ROWS = 12;
const SLACK_PART_LIMIT = 4500;
const TESTMU_TEST_URL = 'https://appautomation.lambdatest.com/test?testID=';
const TESTMU_TEST_ID_IN_RECORDING =
  /\/([A-Z]{2,}-[A-Z]{2,}-\d+-[A-Za-z0-9]+)\/video\//;

const MADRID_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: MADRID_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = {
    hours: DEFAULT_HOURS,
    repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    workflow: DEFAULT_WORKFLOW,
    branch: DEFAULT_BRANCH,
    event: DEFAULT_EVENT,
    outDir: null,
    runLimit: 50,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--hours':
        args.hours = Number(next);
        i += 1;
        break;
      case '--repo':
        args.repo = next;
        i += 1;
        break;
      case '--workflow':
        args.workflow = next;
        i += 1;
        break;
      case '--branch':
        args.branch = next;
        i += 1;
        break;
      case '--event':
        args.event = next;
        i += 1;
        break;
      case '--out-dir':
        args.outDir = next;
        i += 1;
        break;
      case '--run-limit':
        args.runLimit = Number(next);
        i += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) {
    fail('--hours must be a positive number');
  }
  if (!Number.isFinite(args.runLimit) || args.runLimit <= 0) {
    fail('--run-limit must be a positive number');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs [options]

Options:
  --hours <n>          Lookback window in hours (default: ${DEFAULT_HOURS})
  --repo <owner/name>  GitHub repo (default: ${DEFAULT_REPO})
  --workflow <file>    Workflow file name (default: ${DEFAULT_WORKFLOW})
  --branch <name>      Branch to include (default: ${DEFAULT_BRANCH})
  --event <name>       Workflow event to include (default: ${DEFAULT_EVENT})
  --out-dir <path>     Output directory (default: tmp dir)
  --run-limit <n>      Max workflow runs to list (default: 50)
`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGh(ghArgs) {
  const result = spawnSync('gh', ghArgs, {
    encoding: 'utf8',
    env: {
      ...process.env,
      GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(stderr || stdout || `gh ${ghArgs.join(' ')} failed`);
  }
  return (result.stdout || '').trim();
}

/**
 * @param {string | number | Date} value
 * @returns {string}
 */
export function formatMadrid(value) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = MADRID_FORMAT.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
}

/**
 * @param {number | null | undefined} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '—';
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds - minutes * 60);
    return `${minutes}m ${rest}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

/**
 * @param {number | null | undefined} current
 * @param {number | null | undefined} previous
 * @returns {number | null}
 */
export function percentDelta(current, previous) {
  if (
    typeof current !== 'number' ||
    typeof previous !== 'number' ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * @param {number | null | undefined} delta
 * @returns {string}
 */
export function formatDelta(delta) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) {
    return '—';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

/**
 * @param {number} passed
 * @param {number} total
 * @returns {string}
 */
export function formatPassRate(passed, total) {
  if (!total) {
    return '—';
  }
  const pct = Math.round((passed / total) * 1000) / 10;
  return `${pct}% (${passed}/${total})`;
}

/**
 * @param {string | null | undefined} reason
 * @returns {string}
 */
export function reasonLabel(reason) {
  switch (reason) {
    case 'quality_gates_exceeded':
      return 'Quality gates exceeded';
    case 'session_creation_failed':
      return 'Session creation failed';
    case 'no_performance_metrics':
      return 'No performance metrics';
    case 'timedOut':
      return 'Timed out';
    case 'test_error':
    case 'failed':
      return 'Test error';
    default:
      return reason || 'Unknown';
  }
}

/**
 * Plain team name. Strips Slack subteam markup so a DM does not notify a group.
 * @param {unknown} team
 * @returns {string}
 */
export function teamLabel(team) {
  if (!team) {
    return '—';
  }
  if (typeof team === 'string') {
    return team.replace(/^@/, '') || '—';
  }
  if (typeof team !== 'object') {
    return '—';
  }
  const record = /** @type {{ teamName?: string, slackMention?: string, teamId?: string }} */ (
    team
  );
  const mention = record.slackMention || '';
  const subteam = /<!subteam\^[^|]+\|([^>]+)>/.exec(mention);
  if (subteam) {
    return subteam[1];
  }
  const name = record.teamName || record.teamId || mention;
  return String(name || '—').replace(/^@/, '') || '—';
}

/**
 * @param {number[]} values
 * @returns {number | null}
 */
export function median(values) {
  const nums = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!nums.length) {
    return null;
  }
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 1) {
    return nums[mid];
  }
  return (nums[mid - 1] + nums[mid]) / 2;
}

function shortDevice(device) {
  return String(device)
    .replace(' (TestMu HE)', '')
    .replace(/\+[\d.]+$/, '');
}

function displayName(testName, device, showDevice) {
  if (!showDevice || !device) {
    return testName;
  }
  return `${testName} (${shortDevice(device)})`;
}

function qualityGateText(qualityGates) {
  const violations = (qualityGates?.violations ?? []).filter(
    (violation) =>
      typeof violation?.actual === 'number' &&
      typeof violation?.threshold === 'number',
  );
  if (!violations.length) {
    return null;
  }
  return violations
    .slice(0, 2)
    .map((violation) => {
      const subject =
        violation.type === 'total'
          ? 'Total'
          : violation.stepName || 'Step';
      return `${subject} ${Math.round(violation.actual)}ms > ${Math.round(violation.threshold)}ms`;
    })
    .join('; ');
}

/**
 * @param {{ failureReason?: string | null, failureMessage?: string | null, qualityGates?: object | null }} scenario
 * @returns {string}
 */
export function errorText(scenario) {
  const gate =
    scenario.failureReason === 'quality_gates_exceeded'
      ? qualityGateText(scenario.qualityGates)
      : null;
  const raw =
    gate ||
    describeFailure(reasonLabel(scenario.failureReason), scenario.failureMessage);
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, 160);
}

/**
 * Last two path segments of a GitHub job name.
 * @param {string} name
 * @returns {string}
 */
export function shortJobName(name) {
  const parts = String(name)
    .split(' / ')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(-2).join(' / ') || String(name);
}

/**
 * TestMu recording URLs point at the test page, which is stable and shorter
 * than the signed video URL.
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function recordingHref(url) {
  if (!url) {
    return '';
  }
  const testId = TESTMU_TEST_ID_IN_RECORDING.exec(url)?.[1];
  return testId ? `${TESTMU_TEST_URL}${testId}` : url;
}

function deviceKey(device) {
  if (!device) {
    return '';
  }
  if (typeof device === 'string') {
    return device;
  }
  if (typeof device === 'object') {
    const name = device.name ?? '';
    const version = device.osVersion ?? '';
    return version ? `${name}+${version}` : String(name);
  }
  return String(device);
}

/**
 * Collapse retries for one results file. A scenario passed when any attempt passed.
 * Duration comes from the passing attempt.
 * @param {object | null | undefined} performanceResults
 */
export function extractScenarios(performanceResults) {
  const groups = new Map();
  if (!performanceResults || typeof performanceResults !== 'object') {
    return [];
  }

  for (const platform of Object.keys(performanceResults)) {
    const devices = performanceResults[platform];
    if (!devices || typeof devices !== 'object' || Array.isArray(devices)) {
      continue;
    }
    for (const device of Object.keys(devices)) {
      const tests = devices[device];
      if (!Array.isArray(tests)) {
        continue;
      }
      for (const test of tests) {
        if (!test || typeof test.testName !== 'string' || !test.testName) {
          continue;
        }
        const key = `${test.testName}\0${device}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(test);
      }
    }
  }

  return [...groups.entries()].map(([, executions]) => {
    const passedExecutions = executions.filter((test) => !test.testFailed);
    const failedExecutions = executions.filter((test) => test.testFailed);
    const passed = passedExecutions.length > 0;
    const passing = passedExecutions[passedExecutions.length - 1];
    const failing = failedExecutions[failedExecutions.length - 1];
    const source = passing || failing || executions[0];
    const totalTimeSec =
      typeof passing?.totalTime === 'number' ? passing.totalTime : null;

    return {
      testName: source.testName,
      device: deviceKey(source.device) || executions[0]?.device || '',
      passed,
      teamName: teamLabel(source.team || failing?.team),
      totalTimeSec,
      failureReason: passed ? null : failing?.failureReason ?? null,
      failureMessage: passed ? null : failing?.failureMessage ?? null,
      qualityGates: passed ? null : failing?.qualityGates ?? null,
      recordingUrl: (failing?.videoURL || source.videoURL) ?? null,
      retried: passed && failedExecutions.length > 0,
    };
  });
}

/**
 * @param {object | null | undefined} summary
 */
export function scenariosFromSummary(summary) {
  const teams = summary?.failedTestsStats?.failedTestsByTeam ?? {};
  const scenarios = [];
  for (const group of Object.values(teams)) {
    for (const test of group?.tests ?? []) {
      if (!test?.testName) {
        continue;
      }
      scenarios.push({
        testName: test.testName,
        device: deviceKey(test.device),
        passed: false,
        teamName: teamLabel(test.team || group.team),
        totalTimeSec: null,
        failureReason: test.failureReason ?? null,
        failureMessage: test.failureMessage ?? null,
        qualityGates: test.qualityGates ?? null,
        recordingUrl: test.recordingLink ?? test.videoURL ?? null,
        retried: false,
      });
    }
  }
  return scenarios;
}

/**
 * @param {{ status?: string, conclusion?: string | null, uniqueTests?: number, failedTests?: number, scenariosComplete?: boolean }} run
 * @returns {string}
 */
export function classifyRun(run) {
  if (run.status && run.status !== 'completed') {
    return 'In progress';
  }
  if (run.conclusion === 'cancelled') {
    return 'Cancelled';
  }
  const uniqueTests = Number(run.uniqueTests) || 0;
  const failedTests = Number(run.failedTests) || 0;
  if (uniqueTests <= 0) {
    if (run.conclusion === 'failure') {
      return 'Workflow failed';
    }
    return 'No results';
  }
  if (failedTests > 0) {
    return 'Failed';
  }
  return 'Passed';
}

/**
 * @param {Array<{ createdAt?: string, event?: string, headBranch?: string }>} runs
 * @param {{ now: Date, hours: number, branch?: string, event?: string }} options
 */
export function selectRuns(runs, { now, hours, branch = DEFAULT_BRANCH, event = DEFAULT_EVENT }) {
  const end = now.getTime();
  const currentStart = end - hours * 60 * 60 * 1000;
  const previousStart = currentStart - hours * 60 * 60 * 1000;
  const eligible = (runs || []).filter(
    (run) => run?.event === event && run?.headBranch === branch && run?.createdAt,
  );
  const stamp = (run) => new Date(run.createdAt).getTime();
  const inWindow = (run, start, finish, includeFinish) => {
    const time = stamp(run);
    return time >= start && (includeFinish ? time <= finish : time < finish);
  };

  const sortByStart = (left, right) => stamp(left) - stamp(right);
  return {
    current: eligible
      .filter((run) => inWindow(run, currentStart, end, true))
      .sort(sortByStart),
    previous: eligible
      .filter((run) => inWindow(run, previousStart, currentStart, false))
      .sort(sortByStart),
    currentStart: new Date(currentStart).toISOString(),
    previousStart: new Date(previousStart).toISOString(),
    end: now.toISOString(),
  };
}

function indexScenarios(runs) {
  const map = new Map();
  for (const run of runs) {
    for (const scenario of run.scenarios || []) {
      const key = `${scenario.testName}\0${scenario.device || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          testName: scenario.testName,
          device: scenario.device || '',
          teamName: scenario.teamName || '—',
          samples: [],
        });
      }
      const row = map.get(key);
      if (scenario.teamName && scenario.teamName !== '—') {
        row.teamName = scenario.teamName;
      }
      row.samples.push({
        createdAt: run.createdAt,
        url: run.url,
        passed: Boolean(scenario.passed),
        totalTimeSec: scenario.passed ? scenario.totalTimeSec : null,
        retried: Boolean(scenario.retried),
        failureReason: scenario.failureReason,
        failureMessage: scenario.failureMessage,
        qualityGates: scenario.qualityGates,
        recordingUrl: scenario.recordingUrl,
      });
    }
  }
  return [...map.values()];
}

function stabilityLabel(samples) {
  const passed = samples.filter((sample) => sample.passed).length;
  const failed = samples.length - passed;
  if (failed > 0 && passed > 0) {
    return 'flaky';
  }
  if (failed > 0) {
    return 'failing';
  }
  if (samples.some((sample) => sample.retried)) {
    return 'passed on retry';
  }
  return 'stable';
}

function countDelta(current, previous) {
  if (previous == null) {
    return '—';
  }
  const delta = current - previous;
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function rate(passed, total) {
  if (!total) {
    return null;
  }
  return passed / total;
}

function formatPp(currentRate, previousRate) {
  if (currentRate == null || previousRate == null) {
    return '—';
  }
  const pp = Math.round((currentRate - previousRate) * 1000) / 10;
  return `${pp > 0 ? '+' : ''}${pp} pp`;
}

function scenarioStats(runs) {
  let total = 0;
  let failed = 0;
  for (const run of runs) {
    if (!countsTowardStability(run)) {
      continue;
    }
    total += run.scenarios.length;
    failed += run.scenarios.filter((scenario) => !scenario.passed).length;
  }
  return {
    total,
    failed,
    passed: total - failed,
    rate: rate(total - failed, total),
  };
}

function countsTowardStability(run) {
  return Boolean(
    run.scenariosComplete &&
      run.result !== 'Cancelled' &&
      run.result !== 'In progress',
  );
}

/**
 * @param {object} options
 */
export function buildReport({
  currentRuns,
  previousRuns,
  window,
  repo,
  historyTruncated = false,
}) {
  const current = currentRuns.map(decorateCountedRun);
  const previous = previousRuns.map(decorateCountedRun);
  const showDevice =
    new Set(
      current
        .filter(countsTowardStability)
        .flatMap((run) => run.scenarios || [])
        .map((scenario) => scenario.device)
        .filter(Boolean),
    ).size > 1;

  const currentComplete = current.filter(countsTowardStability);
  const previousComplete = previous.filter(countsTowardStability);
  const currentRows = indexScenarios(currentComplete).map((row) => {
    const passed = row.samples.filter((sample) => sample.passed).length;
    const name = displayName(row.testName, row.device, showDevice);
    return {
      ...row,
      name,
      runs: row.samples.length,
      passed,
      failed: row.samples.length - passed,
      label: stabilityLabel(row.samples),
      medianSec: median(
        row.samples.filter((sample) => sample.passed).map((sample) => sample.totalTimeSec),
      ),
      durationSamples: row.samples.filter(
        (sample) => sample.passed && typeof sample.totalTimeSec === 'number',
      ).length,
    };
  });
  const previousRows = indexScenarios(previousComplete).map((row) => {
    const failed = row.samples.filter((sample) => !sample.passed).length;
    return {
      name: displayName(row.testName, row.device, showDevice),
      failRate: row.samples.length ? failed / row.samples.length : null,
      label: stabilityLabel(row.samples),
      medianSec: median(
        row.samples.filter((sample) => sample.passed).map((sample) => sample.totalTimeSec),
      ),
      durationSamples: row.samples.filter(
        (sample) => sample.passed && typeof sample.totalTimeSec === 'number',
      ).length,
    };
  });
  const previousByName = new Map(previousRows.map((row) => [row.name, row]));

  const trends = currentRows
    .map((row) => {
      const prior = previousByName.get(row.name);
      const durationPct = percentDelta(row.medianSec, prior?.medianSec ?? null);
      const nowFailRate = row.runs ? row.failed / row.runs : null;
      const priorFailRate = prior?.failRate ?? null;
      const failChanged =
        nowFailRate != null &&
        priorFailRate != null &&
        Math.round(nowFailRate * 100) !== Math.round(priorFailRate * 100);
      const durationMoved =
        durationPct != null &&
        Math.abs(durationPct) >= DURATION_MOVE_PCT &&
        row.durationSamples >= 2 &&
        (prior?.durationSamples ?? 0) >= 2;
      return {
        name: row.name,
        nowMedian: row.medianSec,
        priorMedian: prior?.medianSec ?? null,
        durationPct,
        nowFailRate,
        priorFailRate,
        failChanged,
        durationMoved,
      };
    })
    .filter((row) => row.failChanged || row.durationMoved)
    .sort((left, right) => {
      const leftScore =
        (left.failChanged ? 100 : 0) + (left.durationPct ?? 0);
      const rightScore =
        (right.failChanged ? 100 : 0) + (right.durationPct ?? 0);
      return rightScore - leftScore;
    });

  const errors = collectErrors(current, showDevice);
  for (const error of errors) {
    const row = currentRows.find((candidate) => candidate.name === error.name);
    if (row) {
      error.failedRuns = row.failed;
      error.runsSeen = row.runs;
    }
  }
  const workflowErrors = current
    .filter(
      (run) =>
        run.result === 'Workflow failed' ||
        (run.result === 'Cancelled' && run.uniqueTests === 0),
    )
    .map((run) => ({
      createdAt: run.createdAt,
      url: run.url,
      result: run.result,
      jobs: run.failedJobs || [],
    }))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const currentStats = scenarioStats(current);
  const previousStats = scenarioStats(previous);
  const stability = {
    stable: currentRows.filter((row) => row.label === 'stable').length,
    retried: currentRows.filter((row) => row.label === 'passed on retry').length,
    flaky: currentRows.filter((row) => row.label === 'flaky').length,
    failing: currentRows.filter((row) => row.label === 'failing').length,
    rows: currentRows
      .filter((row) => row.label !== 'stable')
      .sort((left, right) => {
        const order = { failing: 0, flaky: 1, 'passed on retry': 2 };
        return (
          (order[left.label] ?? 9) - (order[right.label] ?? 9) ||
          right.failed - left.failed ||
          left.name.localeCompare(right.name)
        );
      }),
  };

  const report = {
    meta: {
      repo,
      hours: window.hours,
      from: window.currentStart,
      to: window.end,
      previousFrom: window.previousStart,
      timezone: MADRID_TZ,
      generatedAt: new Date().toISOString(),
      historyTruncated,
      workflow: DEFAULT_WORKFLOW,
    },
    summary: {
      currentRuns: current.length,
      previousRuns: previous.length,
      currentWithResults: current.filter((run) => run.uniqueTests > 0).length,
      previousWithResults: previous.filter((run) => run.uniqueTests > 0).length,
      workflowFailures: workflowErrors.length,
      previousWorkflowFailures: previous.filter(
        (run) =>
          run.result === 'Workflow failed' ||
          (run.result === 'Cancelled' && run.uniqueTests === 0),
      ).length,
      inProgress: current.filter((run) => run.result === 'In progress').length,
      current: currentStats,
      previous: previousStats,
      scenariosFailedAtLeastOnce: currentRows.filter((row) => row.failed > 0).length,
      previousScenariosFailedAtLeastOnce: previousRows.filter(
        (row) => row.failRate != null && row.failRate > 0,
      ).length,
      flaky: stability.flaky,
      failing: stability.failing,
      retried: stability.retried,
      stable: stability.stable,
      previousFlaky: previousRows.filter((row) => row.label === 'flaky').length,
      previousFailing: previousRows.filter((row) => row.label === 'failing').length,
      previousStable: previousRows.filter((row) => row.label === 'stable').length,
    },
    runs: [...current].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
    ),
    workflowErrors,
    errors,
    stability,
    trends,
    showDevice,
  };
  report.analysis = buildAnalysis(report);
  return report;
}

function decorateCountedRun(run) {
  const scenarios = run.scenarios || [];
  const uniqueTests = run.scenariosComplete
    ? scenarios.length
    : Number(run.summary?.uniqueTests ?? run.summary?.totalTests ?? 0);
  const failedTests = run.scenariosComplete
    ? scenarios.filter((scenario) => !scenario.passed).length
    : Number(run.summary?.failedTestsStats?.uniqueFailedTests ?? 0);
  return {
    ...run,
    scenarios,
    uniqueTests,
    failedTests,
    result: classifyRun({
      status: run.status,
      conclusion: run.conclusion,
      uniqueTests,
      failedTests,
      scenariosComplete: run.scenariosComplete,
    }),
  };
}

function collectErrors(runs, showDevice) {
  const byName = new Map();
  for (const run of runs) {
    for (const scenario of run.scenarios || []) {
      if (scenario.passed) {
        continue;
      }
      const name = displayName(scenario.testName, scenario.device, showDevice);
      if (!byName.has(name)) {
        byName.set(name, {
          name,
          teamName: scenario.teamName || '—',
          failures: [],
          runsSeen: 0,
        });
      }
      byName.get(name).failures.push({
        createdAt: run.createdAt,
        reason: reasonLabel(scenario.failureReason),
        message: errorText(scenario),
        recordingUrl: scenario.recordingUrl,
      });
    }
  }

  return [...byName.values()]
    .map((entry) => {
      const latest = [...entry.failures].sort(
        (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
      )[0];
      return {
        ...entry,
        latest,
        failedRuns: entry.failures.length,
      };
    })
    .sort((left, right) => right.failedRuns - left.failedRuns || left.name.localeCompare(right.name));
}

/**
 * @param {object} report
 * @returns {string[]}
 */
export function buildAnalysis(report) {
  const bullets = [];
  const { summary } = report;
  if (summary.currentRuns === 0) {
    return [
      'No scheduled performance run started in the last 24 hours. The suite runs at 00:00, 06:00, 12:00, and 18:00 UTC, Monday through Saturday.',
    ];
  }

  if (summary.workflowFailures > 0) {
    const latest = report.workflowErrors[0];
    const when = latest ? formatMadrid(latest.createdAt) : 'this window';
    const jobs = latest?.jobs?.length
      ? ` Failed jobs: ${latest.jobs.map(shortJobName).join(', ')}.`
      : '';
    const runWord = summary.workflowFailures === 1 ? 'run' : 'runs';
    bullets.push(
      `${summary.workflowFailures} scheduled ${runWord} failed before producing scenario results. Latest: ${when}.${jobs}`,
    );
  }

  const passRate = formatPassRate(summary.current.passed, summary.current.total);
  const pp = formatPp(summary.current.rate, summary.previous.rate);
  if (summary.current.total > 0) {
    const comparison =
      summary.previous.total > 0
        ? pp === '0 pp'
          ? ', unchanged versus the previous 24 hours'
          : `, ${pp} versus the previous 24 hours`
        : '';
    bullets.push(`Scenario pass rate was ${passRate}${comparison}.`);
  }

  const worst = report.stability.rows.find((row) => row.label === 'failing' || row.label === 'flaky');
  if (worst) {
    bullets.push(
      `${worst.name} is ${worst.label}: ${worst.failed} failed and ${worst.passed} passed across ${worst.runs} ${worst.runs === 1 ? 'run' : 'runs'}.`,
    );
  }

  const durationMove = report.trends.find((row) => row.durationMoved);
  if (durationMove && bullets.length < 3) {
    bullets.push(
      `${durationMove.name} median duration moved from ${formatDuration(durationMove.priorMedian)} to ${formatDuration(durationMove.nowMedian)} (${formatDelta(durationMove.durationPct)}).`,
    );
  }

  if (bullets.length === 0 || (summary.workflowFailures === 0 && !worst && !durationMove)) {
    if (summary.stable > 0 && summary.flaky === 0 && summary.failing === 0) {
      bullets.push(
        `${summary.stable} scenario(s) passed every run that included them, and no median duration moved by ${DURATION_MOVE_PCT}% or more.`,
      );
    }
  }

  return bullets.slice(0, 3);
}

function cell(value) {
  const text = String(value ?? '—')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
  return text || '—';
}

function markdownTable(headers, rows) {
  if (!rows.length) {
    return '';
  }
  const head = `| ${headers.map(cell).join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((row) => `| ${row.map(cell).join(' | ')} |`)
    .join('\n');
  return `${head}\n${separator}\n${body}`;
}

function link(url, label) {
  if (!url) {
    return '—';
  }
  return `[${label}](${url})`;
}

function failRateLabel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return `${Math.round(value * 100)}%`;
}

/**
 * @param {object} report
 * @returns {string}
 */
export function buildSlackMarkdown(report) {
  const lines = [
    '*Daily performance tests*',
    `_Window:_ ${formatMadrid(report.meta.from)} → ${formatMadrid(report.meta.to)} (${report.meta.timezone})`,
    '_Source:_ scheduled `run-performance-e2e-manual` runs on `main`',
    '',
    '*Analysis*',
    ...report.analysis.map((bullet) => `- ${bullet}`),
    '',
    '*Summary*',
    'Scenario pass rate counts each scenario once per run, after retries. Duration trends use the passing attempt.',
    '',
    markdownTable(
      ['Metric', 'Last 24h', 'Previous 24h', 'Change'],
      [
        [
          'Scheduled runs',
          String(report.summary.currentRuns),
          String(report.summary.previousRuns),
          countDelta(report.summary.currentRuns, report.summary.previousRuns),
        ],
        [
          'Runs with results',
          String(report.summary.currentWithResults),
          String(report.summary.previousWithResults),
          countDelta(
            report.summary.currentWithResults,
            report.summary.previousWithResults,
          ),
        ],
        [
          'Workflow failures',
          String(report.summary.workflowFailures),
          String(report.summary.previousWorkflowFailures),
          countDelta(
            report.summary.workflowFailures,
            report.summary.previousWorkflowFailures,
          ),
        ],
        [
          'Scenario pass rate',
          formatPassRate(report.summary.current.passed, report.summary.current.total),
          formatPassRate(report.summary.previous.passed, report.summary.previous.total),
          formatPp(report.summary.current.rate, report.summary.previous.rate),
        ],
        [
          'Scenarios that failed',
          String(report.summary.scenariosFailedAtLeastOnce),
          String(report.summary.previousScenariosFailedAtLeastOnce),
          countDelta(
            report.summary.scenariosFailedAtLeastOnce,
            report.summary.previousScenariosFailedAtLeastOnce,
          ),
        ],
        [
          'Flaky scenarios',
          String(report.summary.flaky),
          String(report.summary.previousFlaky),
          countDelta(report.summary.flaky, report.summary.previousFlaky),
        ],
        [
          'Failing every run',
          String(report.summary.failing),
          String(report.summary.previousFailing),
          countDelta(report.summary.failing, report.summary.previousFailing),
        ],
        [
          'Stable scenarios',
          String(report.summary.stable),
          String(report.summary.previousStable),
          countDelta(report.summary.stable, report.summary.previousStable),
        ],
      ],
    ),
    '',
    '*Runs*',
  ];

  if (report.summary.inProgress > 0) {
    lines.push(
      `${report.summary.inProgress} run(s) were still in progress. They are listed below and excluded from pass rate, stability, and trends.`,
    );
  }

  const runTable = markdownTable(
    ['Started', 'Result', 'Tests', 'Failed', 'Pass rate', 'Run'],
    report.runs.map((run) => [
      formatMadrid(run.createdAt),
      run.result,
      run.uniqueTests > 0 ? String(run.uniqueTests) : '—',
      run.uniqueTests > 0 ? String(run.failedTests) : '—',
      formatPassRate(
        Math.max(run.uniqueTests - run.failedTests, 0),
        run.uniqueTests,
      ),
      link(run.url, 'Open'),
    ]),
  );
  lines.push(runTable || '_No scheduled runs in this window._');
  lines.push('', '*Test errors*');

  if (report.workflowErrors.length) {
    lines.push('Workflow failures:');
    for (const error of report.workflowErrors) {
      const jobs = error.jobs.length
        ? ` Jobs: ${error.jobs.map(shortJobName).join(', ')}.`
        : '';
      lines.push(
        `- ${link(error.url, formatMadrid(error.createdAt))} — ${error.result}.${jobs}`,
      );
    }
    lines.push('');
  }

  const errorRows = report.errors.slice(0, MAX_ERROR_ROWS).map((error) => [
    error.name,
    error.teamName,
    error.latest.reason,
    error.runsSeen > 0 ? `${error.failedRuns}/${error.runsSeen}` : String(error.failedRuns),
    error.latest.message,
    recordingHref(error.latest.recordingUrl)
      ? link(recordingHref(error.latest.recordingUrl), 'Watch')
      : '—',
  ]);
  lines.push(
    errorRows.length
      ? markdownTable(
          ['Scenario', 'Team', 'Reason', 'Failed', 'Error', 'Recording'],
          errorRows,
        )
      : '_No scenario errors in this window._',
  );
  if (report.errors.length > MAX_ERROR_ROWS) {
    lines.push('', `_${report.errors.length - MAX_ERROR_ROWS} more scenario errors are in report.json._`);
  }

  lines.push(
    '',
    '*Stability*',
    'Stable means the scenario passed every completed run that included it. Flaky means it passed in some of those runs and failed in others. Failing means it failed every time. Passed on retry means the run passed only after an earlier attempt failed.',
    '',
    `${report.summary.stable} scenario(s) were stable.`,
  );
  const stabilityTable = markdownTable(
    ['Scenario', 'Team', 'Runs', 'Passed', 'Failed', 'Stability'],
    report.stability.rows.map((row) => [
      row.name,
      row.teamName,
      String(row.runs),
      String(row.passed),
      String(row.failed),
      row.label,
    ]),
  );
  if (stabilityTable) {
    lines.push('', stabilityTable);
  }

  lines.push(
    '',
    '*Trends*',
    `Compared with the previous 24 hours. A row is included when the fail rate changed, or when median duration moved by at least ${DURATION_MOVE_PCT}% with two or more passing samples on both sides. Positive duration delta means slower.`,
    '',
  );
  const trendTable = markdownTable(
    ['Scenario', 'Now', 'Prior', 'Delta', 'Fail now', 'Fail prior'],
    report.trends.slice(0, MAX_TREND_ROWS).map((row) => [
      row.name,
      formatDuration(row.nowMedian),
      formatDuration(row.priorMedian),
      formatDelta(row.durationPct),
      failRateLabel(row.nowFailRate),
      failRateLabel(row.priorFailRate),
    ]),
  );
  lines.push(
    trendTable ||
      `_No fail-rate change, and no median duration move of ${DURATION_MOVE_PCT}% or more._`,
  );
  if (report.trends.length > MAX_TREND_ROWS) {
    lines.push('', `_${report.trends.length - MAX_TREND_ROWS} more trend rows are in report.json._`);
  }
  if (report.meta.historyTruncated) {
    lines.push(
      '',
      '_The previous 24 hours may be incomplete because the workflow run list did not reach the start of that window._',
    );
  }

  lines.push(
    '',
    '_Setup:_ Daily scheduled performance E2E rollup for the last 24 hours. Times are Europe/Madrid.',
    '_Disclaimer:_ This report is for testing purposes only and is not a production alert.',
  );

  return lines.join('\n');
}

/**
 * @param {string} markdown
 * @param {number} [limit]
 * @returns {string[]}
 */
export function splitSlackMessage(markdown, limit = SLACK_PART_LIMIT) {
  if (markdown.length <= limit) {
    return [markdown];
  }
  const marker = '\n*Stability*\n';
  const index = markdown.indexOf(marker);
  if (index === -1) {
    return [markdown];
  }
  return [markdown.slice(0, index).trimEnd(), markdown.slice(index + 1).trimStart()];
}

function buildBriefing(report) {
  return [
    '# Daily performance briefing',
    '',
    'Use only the numbers in report.json and slack.md.',
    'Do not invent runs, scenarios, durations, or failure reasons.',
    'Do not turn team names into Slack mentions.',
    '',
    '## Analysis already written',
    ...report.analysis.map((bullet) => `- ${bullet}`),
    '',
    'Send slack.md to Slack user UEYQL2PEV. If slack-part-1.md exists, send that first and slack-part-2.md as a second DM.',
  ].join('\n');
}

function listRuns(repo, workflow, limit) {
  const raw = runGh([
    'run',
    'list',
    '--repo',
    repo,
    '--workflow',
    workflow,
    '--limit',
    String(limit),
    '--json',
    'databaseId,conclusion,status,event,headBranch,createdAt,url,headSha,displayTitle',
  ]);
  return JSON.parse(raw || '[]');
}

function listFailedJobs(repo, runId) {
  try {
    const raw = runGh([
      'api',
      `repos/${repo}/actions/runs/${runId}/jobs`,
      '--jq',
      '[.jobs[] | select(.conclusion=="failure" or .conclusion=="cancelled") | .name]',
    ]);
    const jobs = JSON.parse(raw || '[]');
    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.log(`⚠️  Could not list jobs for run ${runId}: ${error.message}`);
    return [];
  }
}

function findNamedFile(dir, name) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name === name) {
        return full;
      }
    }
  }
  return null;
}

function readJson(filePath) {
  if (!filePath) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function downloadAggregatedReports(repo, runId, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  let artifactsRaw;
  try {
    artifactsRaw = runGh(['api', `repos/${repo}/actions/runs/${runId}/artifacts`]);
  } catch (error) {
    return { status: 'download-failed', error: error.message };
  }

  const artifacts = JSON.parse(artifactsRaw || '{}').artifacts || [];
  const aggregated = artifacts
    .filter((artifact) => artifact.name === 'aggregated-reports' && artifact.expired === false)
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
  if (!aggregated) {
    return { status: 'missing' };
  }

  const zipPath = path.join(destDir, 'agg.zip');
  const zipResult = spawnSync(
    'gh',
    ['api', `repos/${repo}/actions/artifacts/${aggregated.id}/zip`],
    {
      encoding: 'buffer',
      maxBuffer: 80 * 1024 * 1024,
      env: {
        ...process.env,
        GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
      },
    },
  );
  if (zipResult.status !== 0) {
    return { status: 'download-failed' };
  }
  fs.writeFileSync(zipPath, zipResult.stdout);
  const unzip = spawnSync('unzip', ['-o', zipPath, '-d', destDir], {
    encoding: 'utf8',
  });
  if (unzip.status !== 0) {
    return { status: 'download-failed' };
  }
  fs.unlinkSync(zipPath);

  try {
    const summary = readJson(findNamedFile(destDir, 'summary.json'));
    const performanceResults = readJson(findNamedFile(destDir, 'performance-results.json'));
    return { status: performanceResults ? 'ok' : 'summary-only', summary, performanceResults };
  } catch (error) {
    return { status: 'download-failed', error: error.message };
  }
}

function hydrateRun(run, repo, cacheDir) {
  const destDir = path.join(cacheDir, String(run.databaseId));
  console.log(`📥 Run ${run.databaseId} (${run.createdAt}, ${run.conclusion || run.status})`);
  const downloaded = downloadAggregatedReports(repo, run.databaseId, destDir);
  const failedJobs =
    run.conclusion === 'failure' || run.conclusion === 'cancelled'
      ? listFailedJobs(repo, run.databaseId)
      : [];
  const scenariosComplete = downloaded.status === 'ok';
  const scenarios = scenariosComplete
    ? extractScenarios(downloaded.performanceResults)
    : scenariosFromSummary(downloaded.summary);

  return {
    databaseId: run.databaseId,
    createdAt: run.createdAt,
    conclusion: run.conclusion,
    status: run.status,
    url: run.url,
    headSha: run.headSha,
    failedJobs,
    artifactStatus: downloaded.status,
    summary: downloaded.summary ?? null,
    scenarios,
    scenariosComplete,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const outDir =
    args.outDir || fs.mkdtempSync(path.join(os.tmpdir(), 'daily-performance-'));
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`🔎 Listing ${args.workflow} runs in ${args.repo}`);
  const listed = listRuns(args.repo, args.workflow, args.runLimit);
  const selected = selectRuns(listed, {
    now,
    hours: args.hours,
    branch: args.branch,
    event: args.event,
  });
  const oldestListed = listed
    .filter((run) => run.event === args.event && run.headBranch === args.branch && run.createdAt)
    .map((run) => new Date(run.createdAt).getTime())
    .sort((left, right) => left - right)[0];
  const historyTruncated =
    oldestListed != null && oldestListed > new Date(selected.previousStart).getTime();

  console.log(
    `📅 Current ${selected.current.length} run(s), previous ${selected.previous.length} run(s)`,
  );

  const cacheDir = path.join(outDir, 'runs');
  const currentRuns = selected.current.map((run) => hydrateRun(run, args.repo, cacheDir));
  const previousRuns = selected.previous.map((run) => hydrateRun(run, args.repo, cacheDir));
  const report = buildReport({
    currentRuns,
    previousRuns,
    window: {
      hours: args.hours,
      currentStart: selected.currentStart,
      previousStart: selected.previousStart,
      end: selected.end,
    },
    repo: args.repo,
    historyTruncated,
  });

  const slack = buildSlackMarkdown(report);
  const parts = splitSlackMessage(slack);
  const reportPath = path.join(outDir, 'report.json');
  const slackPath = path.join(outDir, 'slack.md');
  const briefingPath = path.join(outDir, 'ai-briefing.md');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(slackPath, `${slack}\n`);
  fs.writeFileSync(briefingPath, `${buildBriefing(report)}\n`);
  if (parts.length > 1) {
    fs.writeFileSync(path.join(outDir, 'slack-part-1.md'), `${parts[0]}\n`);
    fs.writeFileSync(path.join(outDir, 'slack-part-2.md'), `${parts[1]}\n`);
  }

  console.log(`\n✅ Wrote:`);
  console.log(`  ${reportPath}`);
  console.log(`  ${slackPath}`);
  console.log(`  ${briefingPath}`);
  console.log(`\nSlack message length: ${slack.length} characters`);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isMainModule()) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
