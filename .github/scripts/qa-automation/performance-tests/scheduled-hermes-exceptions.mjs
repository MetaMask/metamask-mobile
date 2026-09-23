#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

import { scenarioTeam } from './link-scenario-artifacts.mjs';

export const SCHEDULED_BASELINE_HOURS = 7 * 24;
export const MIN_BASELINE_RUNS = 3;
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
 * Compares the newly collected run with the median of prior collected runs.
 * A baseline needs three observations for the scenario; until then the run is
 * collected for future comparisons but cannot generate an alert.
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

  const findings = (currentReport.scenarios || [])
    .map((scenario) => {
      const observations = baselineByScenario.get(scenarioKey(scenario)) || [];
      if (observations.length < MIN_BASELINE_RUNS) {
        return null;
      }
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
      baselineRunCount: baselineReports.length,
      minimumBaselineRuns: MIN_BASELINE_RUNS,
      thresholdRatio: REGRESSION_RATIO,
      profileCount: currentReport.meta.profileCount,
      symbolicatedProfileCount: currentReport.meta.symbolicatedProfileCount,
    },
    findings,
  };
}

export function buildScheduledExceptionSlack(exception) {
  if (!exception.meta.hasFindings) {
    return '';
  }
  const sharedRun = exception.findings.length > 1;
  const lines = [
    '*Hermes CPU-profile run exception*',
    '',
    `_Run:_ <${exception.meta.runUrl}|${exception.meta.runId}>`,
    `_Baseline:_ median of the previous ${exception.meta.baselineHours}h · minimum ${exception.meta.minimumBaselineRuns} runs per scenario`,
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
    `Baseline: previous ${exception.meta.baselineHours}h · ${exception.meta.baselineRunCount} collected runs available · minimum ${exception.meta.minimumBaselineRuns} observations per scenario`,
    '',
  ];
  if (!exception.meta.hasFindings) {
    lines.push(
      'No scenario exceeded the recent median by the 1.5× notification threshold.',
      '',
      'No Slack message was sent.',
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
