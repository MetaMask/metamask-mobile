#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

/**
 * Week-over-week Hermes conclusions. Stable scenarios are omitted; Slack only
 * lists regressions, isolated spikes, new hot frames, and thin coverage.
 */

import { slackTeamMention } from './link-scenario-artifacts.mjs';

export const SPIKE_RATIO = 1.5;
export const RELATIVE_WARN_RATIO = 1.1;
export const MIN_CONTRIBUTOR_SHARE_PCT = 5;
export const MIN_RUNS_FOR_CONCLUSION = 3;
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const STATUS = {
  WORSE: 'worse-than-last-week',
  SPIKE: 'isolated-spike',
  NEW_FRAME: 'new-hot-frame',
  INSUFFICIENT: 'insufficient-data',
};

const STATUS_RANK = {
  [STATUS.WORSE]: 0,
  [STATUS.NEW_FRAME]: 1,
  [STATUS.SPIKE]: 2,
  [STATUS.INSUFFICIENT]: 3,
};

const STATUS_LABEL = {
  [STATUS.WORSE]: 'Worse than last week',
  [STATUS.SPIKE]: 'Isolated spike',
  [STATUS.NEW_FRAME]: 'New hot frame',
  [STATUS.INSUFFICIENT]: 'Insufficient data',
};

/**
 * Monday 00:00 UTC of the UTC week that contains `now`.
 */
export function utcMondayStart(now = new Date()) {
  const date = new Date(now);
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const daysFromMonday = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - daysFromMonday);
  return utc;
}

/**
 * Completed weeks relative to a Monday job: this week is the seven days that
 * just ended at this Monday 00:00 UTC; last week is the seven days before that.
 */
export function weekBounds(now = new Date()) {
  const thisWeekUntil = utcMondayStart(now);
  const thisWeekSince = new Date(thisWeekUntil.getTime() - MS_PER_WEEK);
  const lastWeekSince = new Date(thisWeekSince.getTime() - MS_PER_WEEK);
  return {
    thisWeek: {
      since: thisWeekSince.toISOString(),
      until: thisWeekUntil.toISOString(),
    },
    lastWeek: {
      since: lastWeekSince.toISOString(),
      until: thisWeekSince.toISOString(),
    },
  };
}

export function inHalfOpenRange(isoDate, sinceIso, untilIso) {
  const timestamp = Date.parse(isoDate);
  return timestamp >= Date.parse(sinceIso) && timestamp < Date.parse(untilIso);
}

function displayName(scenario) {
  return String(scenario || '')
    .replace(/__/g, ': ')
    .replace(/_/g, ' ');
}

function formatMs(value) {
  return `${Number(value || 0).toFixed(1)} ms`;
}

function formatDuration(value) {
  const ms = Number(value || 0);
  return ms >= 10_000 ? `${(ms / 1000).toFixed(1)} s` : formatMs(ms);
}

function scenarioKey(scenario) {
  return `${scenario.projectName}|${scenario.scenario}`;
}

function topContributor(scenario) {
  return scenario?.contributors?.[0] || null;
}

function isSymbolicated(contributor) {
  return Boolean(contributor?.url);
}

export function frameIdentity(contributor) {
  if (!contributor?.name) {
    return null;
  }
  if (contributor.url) {
    return `${contributor.name}|${contributor.url}|${contributor.line ?? ''}`;
  }
  return contributor.name;
}

function hasEnoughRuns(scenario) {
  return (scenario?.runsObserved || 0) >= MIN_RUNS_FOR_CONCLUSION;
}

export function isWorseThanLastWeek(current, previous) {
  if (!previous || !(previous.medianJsWorkMs > 0) || !current) {
    return false;
  }
  if (current.medianJsWorkMs >= previous.medianJsWorkMs * SPIKE_RATIO) {
    return true;
  }
  const currentTop = topContributor(current);
  const previousTop = topContributor(previous);
  const sameSymbolicatedFrame =
    isSymbolicated(currentTop) &&
    isSymbolicated(previousTop) &&
    frameIdentity(currentTop) === frameIdentity(previousTop);
  return (
    sameSymbolicatedFrame &&
    current.medianJsWorkMs >= previous.medianJsWorkMs * RELATIVE_WARN_RATIO
  );
}

export function isIsolatedSpike(current) {
  return Boolean(current && current.spikeRatio >= SPIKE_RATIO);
}

export function isNewHotFrame(current, previous) {
  const currentTop = topContributor(current);
  const previousTop = topContributor(previous);
  if (
    !isSymbolicated(currentTop) ||
    !isSymbolicated(previousTop) ||
    !current?.hasDominantFrame
  ) {
    return false;
  }
  return frameIdentity(currentTop) !== frameIdentity(previousTop);
}

function conclusionLine(status, current, previous) {
  const currentTop = topContributor(current);
  if (status === STATUS.INSUFFICIENT) {
    return 'A possible regression is visible, but too few runs reached this scenario to trust it.';
  }
  if (status === STATUS.WORSE) {
    const frame = currentTop
      ? `; top frame \`${currentTop.name}\``
      : '';
    return `Median JS work is up versus last week${frame}.`;
  }
  if (status === STATUS.NEW_FRAME) {
    return `Top symbolicated frame changed from \`${topContributor(previous).name}\` to \`${currentTop.name}\`.`;
  }
  return `One run reached ${current.spikeRatio}× this week's median; the rest of the week sits on the median.`;
}

export function classifyScenario(current, previous) {
  if (!current) {
    return null;
  }

  const worse = isWorseThanLastWeek(current, previous);
  const spike = isIsolatedSpike(current);
  const newFrame = isNewHotFrame(current, previous);
  const needsPrevious = worse || newFrame;
  const thinCurrent = !hasEnoughRuns(current);
  const thinPrevious = needsPrevious && !hasEnoughRuns(previous);

  if (!worse && !spike && !newFrame) {
    return null;
  }
  if (thinCurrent || thinPrevious) {
    return STATUS.INSUFFICIENT;
  }
  if (worse) {
    return STATUS.WORSE;
  }
  if (newFrame) {
    return STATUS.NEW_FRAME;
  }
  return STATUS.SPIKE;
}

export function classifyWeeklyScenarios(thisWindow, lastWindow) {
  const previousByKey = new Map(
    (lastWindow.scenarios || []).map((scenario) => [
      scenarioKey(scenario),
      scenario,
    ]),
  );
  return (thisWindow.scenarios || [])
    .map((current) => {
      const previous = previousByKey.get(scenarioKey(current)) || null;
      const status = classifyScenario(current, previous);
      if (!status) {
        return null;
      }
      return {
        status,
        statusLabel: STATUS_LABEL[status],
        scenario: current.scenario,
        projectName: current.projectName,
        current,
        previous,
        conclusion: conclusionLine(status, current, previous),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const rank = STATUS_RANK[left.status] - STATUS_RANK[right.status];
      if (rank !== 0) {
        return rank;
      }
      return (right.current.medianJsWorkMs || 0) - (left.current.medianJsWorkMs || 0);
    });
}

function countByStatus(cards) {
  return {
    worse: cards.filter((card) => card.status === STATUS.WORSE).length,
    spike: cards.filter((card) => card.status === STATUS.SPIKE).length,
    newFrame: cards.filter((card) => card.status === STATUS.NEW_FRAME)
      .length,
    insufficient: cards.filter((card) => card.status === STATUS.INSUFFICIENT)
      .length,
  };
}

function contributorSlackLine(contributor, scenario) {
  const location = contributor.url
    ? ` (${contributor.url}${contributor.line ? `:${contributor.line}` : ''})`
    : '';
  return `\`${contributor.name}\` ${formatMs(contributor.medianSelfMs)} median self, ${contributor.medianSharePct.toFixed(1)}% of JS work, hot in ${contributor.runsHot}/${scenario.runsObserved} runs${location}`;
}

export function buildWeeklyScenarioCard(card) {
  const { current, previous, statusLabel, conclusion } = card;
  const mention = slackTeamMention(displayName(card.scenario));
  const lines = [
    `*${statusLabel}* · *${displayName(card.scenario)}* ${mention}`,
    `_This week:_ ${current.runsObserved}/${current.runsTotal} runs · median JS ${formatDuration(current.medianJsWorkMs)} (${formatDuration(current.minJsWorkMs)} – ${formatDuration(current.maxJsWorkMs)}) · duty ${current.medianJsDutyPct.toFixed(1)}%`,
  ];
  if (previous && previous.medianJsWorkMs > 0) {
    const ratio = (current.medianJsWorkMs / previous.medianJsWorkMs).toFixed(2);
    lines.push(
      `_vs last week:_ median ${formatDuration(previous.medianJsWorkMs)} → ${formatDuration(current.medianJsWorkMs)} (${ratio}×)`,
    );
  } else {
    lines.push(
      '_vs last week:_ this scenario has no comparable run in the previous week.',
    );
  }
  if (current.contributors?.length) {
    lines.push('_Hot frames (repeated across this week):_');
    for (const contributor of current.contributors.slice(0, 3)) {
      lines.push(`  ${contributorSlackLine(contributor, current)}`);
    }
  }
  if (current.peakRunUrl && current.spikeRatio >= SPIKE_RATIO) {
    lines.push(
      `_Peak:_ <${current.peakRunUrl}|${current.peakRunId}> at ${formatDuration(current.maxJsWorkMs)} (${current.spikeRatio}× this week's median)`,
    );
  }
  lines.push(`_Conclusion:_ ${conclusion}`);
  return lines.join('\n');
}

export function buildWeeklyParentSlack(report) {
  const counts = countByStatus(report.cards);
  const lines = [
    '*Hermes CPU-profile weekly conclusions*',
    ':test_tube: *Disclaimer: this is a testing experiment, not a production alert.* Numbers are for evaluating the analysis itself; do not action or escalate them.',
    '',
    `_This week:_ ${report.meta.thisWeek.since.slice(0, 16)}Z → ${report.meta.thisWeek.until.slice(0, 16)}Z`,
    `_Previous week:_ ${report.meta.lastWeek.since.slice(0, 16)}Z → ${report.meta.lastWeek.until.slice(0, 16)}Z`,
    `_Runs analyzed:_ ${report.meta.thisWeekRunCount} this week · ${report.meta.lastWeekRunCount} previous week (scheduled \`main\` only)`,
    `_Profiles:_ ${report.meta.thisWeekProfileCount} this week · sourcemaps ${report.meta.thisWeekSymbolicatedProfileCount}/${report.meta.thisWeekProfileCount}`,
  ];
  if (report.cards.length === 0) {
    lines.push(
      '',
      'No Hermes JS regressions were detected versus the previous week.',
    );
  } else {
    lines.push(
      '',
      `_Regressions:_ ${counts.worse} worse than last week · ${counts.spike} isolated spike · ${counts.newFrame} new hot frame · ${counts.insufficient} insufficient data`,
      '_Stable scenarios omitted. One card per flagged scenario follows in the thread._',
    );
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; BrowserStack app-profiling data excluded.',
  );
  if (report.meta.sampled) {
    lines.push(
      `_Coverage:_ sampled ${report.meta.thisWeekRunCount}/${report.meta.thisWeekRunsAvailable} and ${report.meta.lastWeekRunCount}/${report.meta.lastWeekRunsAvailable} scheduled runs; medians come from those samples.`,
    );
  }
  lines.push('_Disclaimer:_ Testing experiment only — not a production alert.');
  return lines.join('\n');
}

export function buildWeeklyMarkdown(report) {
  const lines = [
    '# Hermes CPU-profile weekly conclusions',
    '',
    `This week: ${report.meta.thisWeek.since} → ${report.meta.thisWeek.until}`,
    `Previous week: ${report.meta.lastWeek.since} → ${report.meta.lastWeek.until}`,
    `Runs analyzed: ${report.meta.thisWeekRunCount}/${report.meta.thisWeekRunsAvailable} this week · ${report.meta.lastWeekRunCount}/${report.meta.lastWeekRunsAvailable} previous week`,
    '',
  ];
  if (report.cards.length === 0) {
    lines.push(
      'No Hermes JS regressions were detected versus the previous week.',
      '',
    );
    return lines.join('\n');
  }
  for (const card of report.cards) {
    lines.push(`## ${card.statusLabel} — ${displayName(card.scenario)}`);
    lines.push('');
    lines.push(
      `This week: ${card.current.runsObserved}/${card.current.runsTotal} runs, median JS ${formatDuration(card.current.medianJsWorkMs)} (range ${formatDuration(card.current.minJsWorkMs)} – ${formatDuration(card.current.maxJsWorkMs)}), duty ${card.current.medianJsDutyPct.toFixed(1)}%.`,
    );
    if (card.previous) {
      lines.push(
        `Last week median: ${formatDuration(card.previous.medianJsWorkMs)}.`,
      );
    }
    lines.push(`Conclusion: ${card.conclusion}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildWeeklyReport({
  thisWindow,
  lastWindow,
  bounds,
  thisWeekRunCount,
  lastWeekRunCount,
  thisWeekRunsAvailable = thisWeekRunCount,
  lastWeekRunsAvailable = lastWeekRunCount,
}) {
  const cards = classifyWeeklyScenarios(thisWindow, lastWindow);
  return {
    meta: {
      mode: 'weekly-conclusions',
      thisWeek: bounds.thisWeek,
      lastWeek: bounds.lastWeek,
      generatedAt: new Date().toISOString(),
      source: 'Hermes CPU sampling profiles only',
      thisWeekRunCount,
      lastWeekRunCount,
      thisWeekRunsAvailable,
      lastWeekRunsAvailable,
      sampled:
        thisWeekRunCount < thisWeekRunsAvailable ||
        lastWeekRunCount < lastWeekRunsAvailable,
      thisWeekProfileCount: thisWindow.meta?.profileCount || 0,
      thisWeekSymbolicatedProfileCount:
        thisWindow.meta?.symbolicatedProfileCount || 0,
    },
    cards,
  };
}
