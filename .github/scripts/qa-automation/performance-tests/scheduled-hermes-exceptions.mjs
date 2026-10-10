#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

import { scenarioTeam } from './link-scenario-artifacts.mjs';

export const SCHEDULED_BASELINE_HOURS = 7 * 24;
/** Two most recent scheduled runs that produced a collected report. */
export const BASELINE_PREVIOUS_RUNS = 2;
export const MIN_BASELINE_RUNS = BASELINE_PREVIOUS_RUNS;
export const REGRESSION_RATIO = 1.5;

function displayName(scenario) {
  return String(scenario || '')
    .replace(/__/g, ': ')
    .replace(/_/g, ' ');
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDurationsAlike(values) {
  const numbers = values.map((value) => Number(value || 0));
  const seconds = Math.max(...numbers) >= 10_000;
  return numbers.map((ms) =>
    seconds ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(1)} ms`,
  );
}

function scenarioKey(scenario) {
  return `${scenario.projectName}|${scenario.scenario}`;
}

/**
 * The most recent scheduled ticks that produced a collected report, newest
 * first, capped at `limit`. A tick that failed before capturing profiles has
 * no `report.json`; skipping it keeps the baseline on the last real samples
 * inside the window instead of waiting forever on empty ticks.
 */
export function selectBaselineReports(
  scheduledRuns,
  collected,
  limit = BASELINE_PREVIOUS_RUNS,
) {
  const selected = [];
  for (const run of scheduledRuns) {
    const report = collected.get(String(run.databaseId));
    if (!report) {
      continue;
    }
    selected.push(report);
    if (selected.length >= limit) {
      break;
    }
  }
  return selected;
}

/**
 * Compares the newly collected run with the median of the previous two
 * collected scheduled runs. Until both of those runs include the scenario,
 * the run is stored for later but cannot generate an alert.
 */
export function buildScheduledException(currentReport, baselineReports) {
  const baselineByScenario = new Map();
  for (const report of baselineReports) {
    for (const scenario of report.scenarios || []) {
      const key = scenarioKey(scenario);
      const observations = baselineByScenario.get(key) || [];
      observations.push(scenario.jsWorkMs);
      baselineByScenario.set(key, observations);
    }
  }

  const scenarios = currentReport.scenarios || [];
  // A scenario with too little history is not "clean"; it is unchecked. The
  // all-clear says so instead of implying the whole run was compared.
  const comparedScenarios = scenarios.filter(
    (scenario) =>
      (baselineByScenario.get(scenarioKey(scenario)) || []).length >=
      MIN_BASELINE_RUNS,
  );

  const findings = comparedScenarios
    .map((scenario) => {
      const observations = baselineByScenario.get(scenarioKey(scenario)) || [];
      const baselineMedianJsWorkMs = median(observations);
      const ratio =
        baselineMedianJsWorkMs > 0
          ? Number((scenario.jsWorkMs / baselineMedianJsWorkMs).toFixed(2))
          : 0;
      if (ratio < REGRESSION_RATIO) {
        return null;
      }
      return {
        projectName: scenario.projectName,
        scenario: scenario.scenario,
        jsWorkMs: scenario.jsWorkMs,
        baselineMedianJsWorkMs,
        baselineRuns: observations.length,
        ratio,
        owner: scenarioTeam(displayName(scenario.scenario)).handle,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.ratio - left.ratio);

  return {
    meta: {
      mode: 'scheduled-exception',
      hasFindings: findings.length > 0,
      runId: currentReport.meta.runId,
      runUrl: currentReport.meta.runUrl,
      createdAt: currentReport.meta.createdAt,
      baselineHours: SCHEDULED_BASELINE_HOURS,
      baselinePreviousRuns: BASELINE_PREVIOUS_RUNS,
      baselineRunCount: baselineReports.length,
      baselineCreatedAt: baselineReports.map(
        (report) => report.meta?.createdAt || null,
      ),
      minimumBaselineRuns: MIN_BASELINE_RUNS,
      thresholdRatio: REGRESSION_RATIO,
      scenarioCount: scenarios.length,
      comparedScenarioCount: comparedScenarios.length,
      profileCount: currentReport.meta.profileCount,
      symbolicatedProfileCount: currentReport.meta.symbolicatedProfileCount,
    },
    findings,
  };
}

function baselineCoverageNote(meta) {
  const unchecked = meta.scenarioCount - meta.comparedScenarioCount;
  if (unchecked <= 0) {
    return '';
  }
  return ` · ${unchecked} still building a baseline of ${meta.minimumBaselineRuns} runs`;
}

function formatBaselineStamp(isoDate) {
  if (!isoDate || Number.isNaN(Date.parse(isoDate))) {
    return null;
  }
  return `${isoDate.replace('T', ' ').slice(0, 16)} UTC`;
}

function baselineWhen(meta) {
  const stamps = (meta.baselineCreatedAt || [])
    .map(formatBaselineStamp)
    .filter(Boolean);
  if (stamps.length === 0) {
    return '';
  }
  return ` (${stamps.join(', ')})`;
}

/**
 * A clean run still reports. Silence is indistinguishable from a job that
 * stopped running, so the all-clear is the signal that the check is alive.
 */
export function buildScheduledExceptionSlack(exception) {
  const { meta } = exception;
  if (!meta.hasFindings) {
    return [
      '*Hermes CPU-profile run check* · nothing to action',
      `_Run:_ <${meta.runUrl}|${meta.runId}>`,
      `_Checked:_ ${meta.comparedScenarioCount}/${meta.scenarioCount} scenarios against the median of the previous ${meta.baselinePreviousRuns} collected scheduled runs${baselineWhen(meta)}${baselineCoverageNote(meta)}`,
      `_Result:_ no scenario reached ${meta.thresholdRatio}× its recent median JS work.`,
    ].join('\n');
  }
  const sharedRun = exception.findings.length > 1;
  const lines = [
    '*Hermes CPU-profile run exception*',
    '',
    `_Run:_ <${exception.meta.runUrl}|${exception.meta.runId}>`,
    `_Baseline:_ median of the previous ${exception.meta.baselinePreviousRuns} collected scheduled runs${baselineWhen(exception.meta)}`,
    '',
    sharedRun
      ? `*Slow run:* ${exception.findings.length} scenarios exceeded ${exception.meta.thresholdRatio}× their recent median in the same run. Treat this as one run-level anomaly, not ${exception.findings.length} regressions.`
      : `*Possible regression:* one scenario exceeded ${exception.meta.thresholdRatio}× its recent median.`,
    '_Owners are named for routing; no team is notified._',
    '',
  ];
  for (const finding of exception.findings) {
    const [current, baseline] = formatDurationsAlike([
      finding.jsWorkMs,
      finding.baselineMedianJsWorkMs,
    ]);
    lines.push(
      `• *${displayName(finding.scenario)}* — JS work ${current} vs ${baseline} recent median (${finding.ratio}× across ${finding.baselineRuns} baseline runs) · owner ${finding.owner}`,
    );
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; JS work is sampled JS self time, not test duration.',
  );
  return lines.join('\n');
}

export function buildScheduledExceptionMarkdown(exception) {
  const lines = [
    '# Hermes CPU-profile scheduled-run check',
    '',
    `Run: [${exception.meta.runId}](${exception.meta.runUrl})`,
    `Baseline: previous ${exception.meta.baselinePreviousRuns} collected scheduled runs${baselineWhen(exception.meta)} · ${exception.meta.baselineRunCount} collected · minimum ${exception.meta.minimumBaselineRuns} observations per scenario`,
    '',
  ];
  if (!exception.meta.hasFindings) {
    lines.push(
      `Checked ${exception.meta.comparedScenarioCount}/${exception.meta.scenarioCount} scenarios; none reached ${exception.meta.thresholdRatio}× its recent median JS work.`,
      '',
      'An all-clear was posted so a silent channel still means the check stopped running.',
    );
    return lines.join('\n');
  }
  lines.push(
    exception.findings.length > 1
      ? `${exception.findings.length} scenarios crossed the threshold in one run; this is reported as one run-level anomaly.`
      : 'One scenario crossed the notification threshold.',
    '',
  );
  for (const finding of exception.findings) {
    const [current, baseline] = formatDurationsAlike([
      finding.jsWorkMs,
      finding.baselineMedianJsWorkMs,
    ]);
    lines.push(
      `- ${displayName(finding.scenario)} — JS work ${current} vs ${baseline} recent median (${finding.ratio}× across ${finding.baselineRuns} baseline runs), owner ${finding.owner}`,
    );
  }
  return lines.join('\n');
}
