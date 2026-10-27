#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

import { buildRegressionActionsSlack } from './profiling-regression-actions.mjs';
import { scenarioTeam } from './link-scenario-artifacts.mjs';

export const SCHEDULED_BASELINE_HOURS = 7 * 24;
/** Last six scheduled ticks (~36h), not a 7-day pile. */
export const BASELINE_PREVIOUS_RUNS = 6;
/** A tick with no collected report may be replaced by one of the next older ticks, up to this many ticks back. */
export const BASELINE_CANDIDATE_RUNS = BASELINE_PREVIOUS_RUNS + 2;
/** Clean observations a scenario needs after filtering before it is compared. */
export const MIN_BASELINE_RUNS = 4;
export const REGRESSION_RATIO = 1.5;
/** A baseline observation outside median ÷ ratio … median × ratio is a spike. */
export const SPIKE_BAND_RATIO = REGRESSION_RATIO;

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
 * The most recent scheduled ticks before the current run. A tick with no
 * collected report is replaced by the next older one, but only within
 * `candidates` ticks so the baseline never drifts far back in time.
 */
export function selectBaselineReports(
  scheduledRuns,
  collected,
  limit = BASELINE_PREVIOUS_RUNS,
  candidates = BASELINE_CANDIDATE_RUNS,
) {
  return scheduledRuns
    .slice(0, candidates)
    .map((run) => collected.get(String(run.databaseId)))
    .filter(Boolean)
    .slice(0, limit);
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function mostCommonSegmentCount(observations) {
  const counts = new Map();
  for (const { segmentCount } of observations) {
    if (Number.isFinite(segmentCount)) {
      counts.set(segmentCount, (counts.get(segmentCount) || 0) + 1);
    }
  }
  let best = null;
  for (const [segmentCount, count] of counts) {
    if (
      best === null ||
      count > best.count ||
      (count === best.count && segmentCount > best.segmentCount)
    ) {
      best = { segmentCount, count };
    }
  }
  return best?.segmentCount ?? null;
}

/**
 * A run that lost segments under-reports JS work, so it is a measurement
 * error and not a data point. A report from before `segmentCount` was stored
 * is judged by its JS work alone.
 */
function isIncompleteObservation(observation, expectedSegmentCount) {
  if (!(observation.jsWorkMs > 0)) {
    return true;
  }
  return (
    expectedSegmentCount !== null &&
    Number.isFinite(observation.segmentCount) &&
    observation.segmentCount < expectedSegmentCount
  );
}

/**
 * Reduces one scenario's baseline observations to the complete, non-spiking
 * ones. `reference` is their mean, the value the current run is compared with.
 */
function cleanBaseline(observations) {
  const expectedSegmentCount = mostCommonSegmentCount(observations);
  const complete = observations.filter(
    (observation) => !isIncompleteObservation(observation, expectedSegmentCount),
  );
  const center = complete.length > 0 ? median(complete.map((o) => o.jsWorkMs)) : 0;
  const clean = complete.filter(
    (observation) =>
      observation.jsWorkMs <= center * SPIKE_BAND_RATIO &&
      observation.jsWorkMs >= center / SPIKE_BAND_RATIO,
  );
  return {
    expectedSegmentCount,
    clean,
    reference: clean.length > 0 ? mean(clean.map((o) => o.jsWorkMs)) : 0,
    incompleteCount: observations.length - complete.length,
    spikeCount: complete.length - clean.length,
  };
}

function observationFor(report, key) {
  return (report?.scenarios || []).find(
    (scenario) => scenarioKey(scenario) === key,
  );
}

/**
 * Compares the newly collected run with the average of the complete,
 * non-spiking runs among the previous scheduled ones. A scenario with fewer
 * than `MIN_BASELINE_RUNS` clean observations is unchecked, not compared.
 *
 * A scenario over the threshold is only a finding when the previous scheduled
 * run was also over it. A single run over the threshold is reported as
 * pending: most one-run spikes correct themselves on the next run.
 */
export function buildScheduledException(
  currentReport,
  baselineReports,
  { previousReport = null } = {},
) {
  const baselineByScenario = new Map();
  for (const report of baselineReports) {
    for (const scenario of report.scenarios || []) {
      const key = scenarioKey(scenario);
      const observations = baselineByScenario.get(key) || [];
      observations.push({
        jsWorkMs: scenario.jsWorkMs,
        segmentCount: scenario.segmentCount,
      });
      baselineByScenario.set(key, observations);
    }
  }

  const scenarios = currentReport.scenarios || [];
  const cleaned = new Map();
  let excludedIncompleteCount = 0;
  let excludedSpikeCount = 0;
  for (const scenario of scenarios) {
    const key = scenarioKey(scenario);
    const result = cleanBaseline(baselineByScenario.get(key) || []);
    cleaned.set(key, result);
    excludedIncompleteCount += result.incompleteCount;
    excludedSpikeCount += result.spikeCount;
  }

  // A scenario with too little clean history is not "clean"; it is unchecked.
  // The all-clear says so instead of implying the whole run was compared.
  const comparedScenarios = scenarios.filter(
    (scenario) =>
      cleaned.get(scenarioKey(scenario)).clean.length >= MIN_BASELINE_RUNS,
  );

  const overThreshold = comparedScenarios
    .map((scenario) => {
      const key = scenarioKey(scenario);
      const { clean, reference, expectedSegmentCount } = cleaned.get(key);
      const ratio =
        reference > 0
          ? Number((scenario.jsWorkMs / reference).toFixed(2))
          : 0;
      if (ratio < REGRESSION_RATIO) {
        return null;
      }
      const previous = observationFor(previousReport, key);
      const confirmed =
        Boolean(previous) &&
        !isIncompleteObservation(previous, expectedSegmentCount) &&
        previous.jsWorkMs / reference >= REGRESSION_RATIO;
      return {
        confirmed,
        projectName: scenario.projectName,
        scenario: scenario.scenario,
        jsWorkMs: scenario.jsWorkMs,
        // The filtered baseline average. The key keeps its original name so
        // issue markers written before the filter still parse.
        baselineMedianJsWorkMs: Number(reference.toFixed(2)),
        baselineRuns: clean.length,
        ratio,
        owner: scenarioTeam(displayName(scenario.scenario)).handle,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.ratio - left.ratio);

  const findings = overThreshold
    .filter(({ confirmed }) => confirmed)
    .map(({ confirmed: _confirmed, ...finding }) => finding);
  const pending = overThreshold
    .filter(({ confirmed }) => !confirmed)
    .map(({ confirmed: _confirmed, ...finding }) => finding);

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
      minimumBaselineRuns: MIN_BASELINE_RUNS,
      thresholdRatio: REGRESSION_RATIO,
      scenarioCount: scenarios.length,
      comparedScenarioCount: comparedScenarios.length,
      excludedIncompleteCount,
      excludedSpikeCount,
      pendingConfirmationCount: pending.length,
      profileCount: currentReport.meta.profileCount,
      symbolicatedProfileCount: currentReport.meta.symbolicatedProfileCount,
    },
    findings,
    pending,
  };
}

function baselineCoverageNote(meta) {
  const unchecked = meta.scenarioCount - meta.comparedScenarioCount;
  if (unchecked <= 0) {
    return '';
  }
  return ` · ${unchecked} without ${meta.minimumBaselineRuns} clean baseline runs yet`;
}

function baselineExclusionNote(meta) {
  const parts = [];
  if (meta.excludedIncompleteCount > 0) {
    parts.push(`${meta.excludedIncompleteCount} incomplete`);
  }
  if (meta.excludedSpikeCount > 0) {
    parts.push(`${meta.excludedSpikeCount} spiking`);
  }
  return parts.length > 0
    ? ` · excluded ${parts.join(' and ')} baseline observations`
    : '';
}

function pendingNote(exception) {
  const pending = exception.pending || [];
  if (pending.length === 0) {
    return '';
  }
  const names = pending
    .map((finding) => `${displayName(finding.scenario)} (${finding.ratio}×)`)
    .join(', ');
  return `${pending.length} over ${exception.meta.thresholdRatio}× once, awaiting confirmation by the next scheduled run: ${names}`;
}

/**
 * Issue outcome recorded by the GitHub sync. Absent when the sync did not
 * run (branch run, manual re-analysis, or the flag was off).
 */
function issueSlackSuffix(issue) {
  if (!issue) {
    return '';
  }
  if (issue.error) {
    return ` · GitHub issue not created (${issue.error})`;
  }
  return ` · <${issue.url}|#${issue.number}> ${issue.created ? 'opened' : 'already open, referenced'}`;
}

function issueMarkdownSuffix(issue) {
  if (!issue) {
    return '';
  }
  if (issue.error) {
    return ` — GitHub issue not created (${issue.error})`;
  }
  return ` — [#${issue.number}](${issue.url}) ${issue.created ? 'opened' : 'already open, referenced'}`;
}

/**
 * Slack user-group mention for the scenario's owning team. A team with no
 * group id stays plain text, so the message does not invent a ping.
 */
function slackOwnerMention(scenario) {
  const team = scenarioTeam(displayName(scenario));
  if (!team.id) {
    return team.handle;
  }
  return `<!subteam^${team.id}|${team.handle}>`;
}

function openedBugs(exception) {
  return exception.findings.filter(
    (finding) => finding.issue?.created && finding.issue?.url,
  );
}

/**
 * A finding is tracked only after issue sync stored a URL. The digest is
 * also built when `--github-issues` is off or a create/comment failed, so
 * the headline must not claim a bug that was never opened.
 */
function everyFindingHasBug(findings) {
  return (
    findings.length > 0 &&
    findings.every((finding) => Boolean(finding.issue?.url))
  );
}

function multiScenarioHeadline(exception, slack) {
  const count = exception.findings.length;
  const crossed = slack
    ? `*${count} scenarios* each exceeded ${exception.meta.thresholdRatio}× their recent average.`
    : `${count} scenarios each crossed the threshold.`;
  return everyFindingHasBug(exception.findings)
    ? `${crossed} Each one is tracked on its own bug.`
    : crossed;
}

function findingComparison(finding) {
  const [current, baseline] = formatDurationsAlike([
    finding.jsWorkMs,
    finding.baselineMedianJsWorkMs,
  ]);
  return `${current} vs ${baseline} recent average (${finding.ratio}× across ${finding.baselineRuns} baseline runs)`;
}

/**
 * Message for #metamask-performance when this run opened a bug. The owning
 * team is mentioned. A referenced issue, or a run with no issue, returns
 * null so that channel stays quiet.
 */
export function buildPerformanceChannelSlack(exception) {
  const opened = openedBugs(exception);
  if (opened.length === 0) {
    return null;
  }
  const { meta } = exception;
  const lines = [];
  if (opened.length > 1) {
    lines.push(
      '*App profiling: bugs opened for review*',
      '',
      `${opened.length} scenarios exceeded ${meta.thresholdRatio}× their recent average JS work. A bug is open for each owning team.`,
      '',
    );
    for (const finding of opened) {
      lines.push(
        `• *${displayName(finding.scenario)}* — JS work ${findingComparison(finding)} · ${slackOwnerMention(finding.scenario)} · Bug: <${finding.issue.url}|#${finding.issue.number}>`,
      );
    }
  } else {
    const finding = opened[0];
    lines.push(
      '*App profiling: bug opened for review*',
      '',
      `*${displayName(finding.scenario)}* is over ${meta.thresholdRatio}× its recent average JS work. A bug is open for the owning team.`,
      '',
      `• JS work: ${findingComparison(finding)}`,
      `• Owner: ${slackOwnerMention(finding.scenario)}`,
      `• Bug: <${finding.issue.url}|#${finding.issue.number}>`,
    );
  }
  lines.push(
    '',
    `_Performance run:_ <${meta.runUrl}|${meta.runId}>`,
    '_Source:_ Hermes CPU sampling only. JS work is sampled JS self time, not test duration.',
  );
  return lines.join('\n');
}

/**
 * A clean run still reports. Silence is indistinguishable from a job that
 * stopped running, so the all-clear is the signal that the check is alive.
 */
export function buildScheduledExceptionSlack(exception) {
  const { meta } = exception;
  if (!meta.hasFindings) {
    const pending = pendingNote(exception);
    return [
      '*Hermes CPU-profile run check* · nothing to action',
      `_Run:_ <${meta.runUrl}|${meta.runId}>`,
      `_Checked:_ ${meta.comparedScenarioCount}/${meta.scenarioCount} scenarios against the average of up to the previous ${meta.baselinePreviousRuns} clean scheduled runs${baselineCoverageNote(meta)}${baselineExclusionNote(meta)}`,
      `_Result:_ no scenario is confirmed over ${meta.thresholdRatio}× its recent average JS work.`,
      ...(pending ? [`_Pending:_ ${pending}`] : []),
    ].join('\n');
  }
  const sharedRun = exception.findings.length > 1;
  const lines = [
    '*Hermes CPU-profile run exception*',
    '',
    `_Run:_ <${exception.meta.runUrl}|${exception.meta.runId}>`,
    `_Baseline:_ average of up to the previous ${exception.meta.baselinePreviousRuns} clean scheduled runs (~36h); over the threshold in this run and the one before it${baselineExclusionNote(exception.meta)}`,
    '',
    sharedRun
      ? multiScenarioHeadline(exception, true)
      : `*Possible regression:* one scenario exceeded ${exception.meta.thresholdRatio}× its recent average.`,
    '_Owners are named for routing; no team is notified._',
    '',
  ];
  for (const finding of exception.findings) {
    const [current, baseline] = formatDurationsAlike([
      finding.jsWorkMs,
      finding.baselineMedianJsWorkMs,
    ]);
    lines.push(
      `• *${displayName(finding.scenario)}* — JS work ${current} vs ${baseline} recent average (${finding.ratio}× across ${finding.baselineRuns} baseline runs) · owner ${finding.owner}${issueSlackSuffix(finding.issue)}`,
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
    `Baseline: average of up to the previous ${exception.meta.baselinePreviousRuns} scheduled runs · ${exception.meta.baselineRunCount} collected · minimum ${exception.meta.minimumBaselineRuns} clean observations per scenario${baselineExclusionNote(exception.meta)}`,
    '',
  ];
  if (!exception.meta.hasFindings) {
    const pending = pendingNote(exception);
    lines.push(
      `Checked ${exception.meta.comparedScenarioCount}/${exception.meta.scenarioCount} scenarios; none confirmed over ${exception.meta.thresholdRatio}× its recent average JS work.`,
      ...(pending ? ['', `Pending: ${pending}`] : []),
      '',
      'An all-clear was posted so a silent channel still means the check stopped running.',
    );
    return lines.join('\n');
  }
  lines.push(
    exception.findings.length > 1
      ? multiScenarioHeadline(exception, false)
      : 'One scenario crossed the notification threshold.',
    '',
  );
  for (const finding of exception.findings) {
    const [current, baseline] = formatDurationsAlike([
      finding.jsWorkMs,
      finding.baselineMedianJsWorkMs,
    ]);
    lines.push(
      `- ${displayName(finding.scenario)} — JS work ${current} vs ${baseline} recent average (${finding.ratio}× across ${finding.baselineRuns} baseline runs), owner ${finding.owner}${issueMarkdownSuffix(finding.issue)}`,
    );
  }
  return lines.join('\n');
}

/**
 * DM body for a scheduled finding that would have opened a GitHub issue.
 * An all-clear returns an empty string so nothing is sent.
 */
export function buildIssueVerdictDm(exception, aiText = null) {
  if (!exception?.meta?.hasFindings) {
    return '';
  }
  const parts = [
    buildScheduledExceptionSlack(exception),
    '',
    '_GitHub:_ no issue was opened. This message is the verdict only.',
  ];
  const proposal = buildRegressionActionsSlack(aiText);
  if (proposal) {
    parts.push('', proposal);
  }
  return parts.join('\n');
}
