#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

/**
 * Week-over-week Hermes conclusions. Stable scenarios are omitted; Slack only
 * lists regressions, isolated spikes, new hot frames, and thin coverage.
 */

import {
  scenarioTeam,
  slackTeamMention,
} from './link-scenario-artifacts.mjs';

export const SPIKE_RATIO = 1.5;
export const RELATIVE_WARN_RATIO = 1.1;
export const MIN_CONTRIBUTOR_SHARE_PCT = 5;
export const MIN_RUNS_FOR_CONCLUSION = 3;
// A scenario is sampled once per run, so a spike belongs to the scenario only
// when no other scenario peaked on the same run. As soon as two do, the run is
// the common factor: with ~20 runs a week, two independent spikes landing on
// the same one is far less likely than one slow run. Keeping the bar at two
// stops a bad device or a noisy agent from paging several teams at once.
export const MIN_SCENARIOS_FOR_SHARED_SPIKE = 2;
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const STATUS = {
  WORSE: 'worse-than-last-week',
  RISING: 'rising-within-the-week',
  SPIKE: 'isolated-spike',
  NEW_FRAME: 'new-hot-frame',
  INSUFFICIENT: 'insufficient-data',
  // Kept out of the findings: the spike is real but the scenario has run
  // clean since, so there is nothing to open work on.
  RECOVERED: 'recovered-spike',
};

const STATUS_RANK = {
  [STATUS.WORSE]: 0,
  [STATUS.RISING]: 1,
  [STATUS.NEW_FRAME]: 2,
  [STATUS.SPIKE]: 3,
  [STATUS.INSUFFICIENT]: 4,
  [STATUS.RECOVERED]: 5,
};

const STATUS_LABEL = {
  [STATUS.WORSE]: 'Worse than last week',
  [STATUS.RISING]: 'Rising within the week',
  [STATUS.SPIKE]: 'Isolated spike',
  [STATUS.NEW_FRAME]: 'New hot frame',
  [STATUS.INSUFFICIENT]: 'Insufficient data',
  [STATUS.RECOVERED]: 'Recovered spike',
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

/**
 * UTC calendar day of an ISO timestamp. Invalid values are ignored so a
 * missing `createdAt` cannot invent a comparison day.
 */
export function utcDateKey(isoDate) {
  if (!isoDate) {
    return null;
  }
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function shiftUtcDateKey(dateKey, dayDelta) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

export function utcDateKeysFromTimestamps(timestamps) {
  return [
    ...new Set(
      timestamps.map((timestamp) => utcDateKey(timestamp)).filter(Boolean),
    ),
  ].sort();
}

export function matchingPreviousWeekdays(dateKeys) {
  return dateKeys.map((dateKey) => shiftUtcDateKey(dateKey, -7));
}

/**
 * An incomplete week is still a valid comparison: only the UTC days that
 * produced this-week reports are kept, and last week is the same weekdays.
 */
export function lastWeekRunsMatchingThisWeekDays(thisWeekReports, lastWeekRuns) {
  const thisWeekDays = utcDateKeysFromTimestamps(
    thisWeekReports.map((report) => report.meta?.createdAt),
  );
  if (thisWeekDays.length === 0) {
    return {
      thisWeekDays,
      lastWeekDays: utcDateKeysFromTimestamps(
        lastWeekRuns.map((run) => run.createdAt),
      ),
      runs: lastWeekRuns,
    };
  }
  const lastWeekDays = matchingPreviousWeekdays(thisWeekDays);
  const allowed = new Set(lastWeekDays);
  return {
    thisWeekDays,
    lastWeekDays,
    runs: lastWeekRuns.filter((run) => allowed.has(utcDateKey(run.createdAt))),
  };
}

export function runsOnUtcDates(runs, dateKeys) {
  const allowed = new Set(dateKeys);
  return runs.filter((run) => allowed.has(utcDateKey(run.createdAt)));
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

/**
 * Durations that are compared to each other, scaled alike. `15.6 s vs
 * 3782.0 ms` makes the reader do the conversion before seeing the ratio.
 */
export function formatDurationsAlike(values) {
  const numbers = values.map((value) => Number(value || 0));
  const seconds = Math.max(...numbers) >= 10_000;
  return numbers.map((ms) =>
    seconds ? `${(ms / 1000).toFixed(1)} s` : formatMs(ms),
  );
}

function scenarioKey(scenario) {
  return `${scenario.projectName}|${scenario.scenario}`;
}

/**
 * Owning team as plain text. A slow run is not that team's regression, so it
 * names the owner without the `<!subteam^…>` syntax that would page them.
 */
function scenarioOwner(scenario) {
  return scenarioTeam(displayName(scenario)).handle;
}

function scenarioOwnerMention(scenario) {
  return slackTeamMention(displayName(scenario));
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

/**
 * The newest runs of the week sit above the earlier ones. A regression landed
 * mid-week reads as a spike against a weekly median the earlier days still
 * dominate, so this is the signal that is worth acting on.
 */
export function isRisingWithinWeek(current) {
  if (!current || !(current.earlierMedianJsWorkMs > 0)) {
    return false;
  }
  return (
    current.tailMedianJsWorkMs >=
    current.earlierMedianJsWorkMs * SPIKE_RATIO
  );
}

/**
 * The spike is behind the scenario: later runs came back to the median. Only
 * says so once there is a run after the peak to prove it.
 */
export function hasRecoveredSinceSpike(current) {
  if (!current || !(current.runsAfterPeak > 0)) {
    return false;
  }
  return (
    current.medianJsWorkMs > 0 &&
    current.tailMedianJsWorkMs <=
      current.medianJsWorkMs * RELATIVE_WARN_RATIO
  );
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
  if (status === STATUS.RISING) {
    const [earlier, tail] = formatDurationsAlike([
      current.earlierMedianJsWorkMs,
      current.tailMedianJsWorkMs,
    ]);
    return `The last ${current.tailRuns} runs of the week sit at ${tail} against ${earlier} earlier in the week, so this is not a one-off: check what landed mid-week.`;
  }
  if (status === STATUS.RECOVERED) {
    return `The peak is ${current.runsAfterPeak} runs old and the scenario has run clean since, so no work is implied.`;
  }
  if (current.runsAfterPeak === 0) {
    return `The newest run of the week is the peak, at ${current.spikeRatio}× the median JS work, so this may be starting rather than over.`;
  }
  return `One run reached ${current.spikeRatio}× this week's median JS work and the runs since have not come back to it.`;
}

export function classifyScenario(current, previous) {
  if (!current) {
    return null;
  }

  const worse = isWorseThanLastWeek(current, previous);
  const spike = isIsolatedSpike(current);
  const newFrame = isNewHotFrame(current, previous);
  const rising = spike && isRisingWithinWeek(current);
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
  if (rising) {
    return STATUS.RISING;
  }
  if (newFrame) {
    return STATUS.NEW_FRAME;
  }
  return hasRecoveredSinceSpike(current) ? STATUS.RECOVERED : STATUS.SPIKE;
}

/**
 * Splits spike cards that all peak on the same run out of the per-scenario
 * list. One slow run is one finding.
 */
export function collapseSharedSpikes(cards) {
  const byRun = new Map();
  for (const card of cards) {
    const spiked =
      card.status === STATUS.SPIKE || card.status === STATUS.RECOVERED;
    if (!spiked || !card.current.peakRunId) {
      continue;
    }
    const runId = String(card.current.peakRunId);
    byRun.set(runId, [...(byRun.get(runId) || []), card]);
  }

  const sharedRuns = [...byRun.entries()].filter(
    ([, grouped]) => grouped.length >= MIN_SCENARIOS_FOR_SHARED_SPIKE,
  );
  if (sharedRuns.length === 0) {
    return { cards, sharedSpikes: [] };
  }

  const collapsed = new Set(sharedRuns.flatMap(([, grouped]) => grouped));
  return {
    cards: cards.filter((card) => !collapsed.has(card)),
    sharedSpikes: sharedRuns
      .map(([runId, grouped]) => ({
        runId,
        runUrl: grouped[0].current.peakRunUrl,
        maxRatio: Math.max(
          ...grouped.map((card) => card.current.spikeRatio || 0),
        ),
        // A bad run is still worth naming, but if every scenario has run
        // clean since, it is history rather than something to chase.
        recovered: grouped.every((card) => card.status === STATUS.RECOVERED),
        scenarios: grouped
          .map((card) => ({
            scenario: card.scenario,
            spikeRatio: card.current.spikeRatio,
            maxJsWorkMs: card.current.maxJsWorkMs,
            medianJsWorkMs: card.current.medianJsWorkMs,
          }))
          .sort((left, right) => right.spikeRatio - left.spikeRatio),
      }))
      .sort((left, right) => right.scenarios.length - left.scenarios.length),
  };
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

function formatDateList(dateKeys) {
  return (dateKeys || []).join(', ');
}

function weeklyDaysWithDataLines(report) {
  const thisWeekDays = report.meta.thisWeekDays || [];
  if (thisWeekDays.length === 0) {
    return [];
  }
  const lastWeekDays = report.meta.lastWeekDays || [];
  const suffix =
    lastWeekDays.length > 0
      ? ` (same weekdays last week: ${formatDateList(lastWeekDays)})`
      : '';
  return [
    `_Days with data:_ ${formatDateList(thisWeekDays)}${suffix}`,
  ];
}

function weeklyDaysWithDataMarkdown(report) {
  const thisWeekDays = report.meta.thisWeekDays || [];
  if (thisWeekDays.length === 0) {
    return [];
  }
  const lastWeekDays = report.meta.lastWeekDays || [];
  const suffix =
    lastWeekDays.length > 0
      ? ` (same weekdays last week: ${formatDateList(lastWeekDays)})`
      : '';
  return [`Days with data: ${formatDateList(thisWeekDays)}${suffix}`];
}

/**
 * Spikes that are already behind the scenario: one line, never a card, so the
 * week is accounted for without asking anyone to look into them.
 */
function weeklyRecoveredLines(report) {
  const recovered = report.recovered || [];
  if (recovered.length === 0) {
    return [];
  }
  const names = recovered
    .map(
      (item) =>
        `${displayName(item.scenario)} (${item.spikeRatio}×, ${item.runsAfterPeak} runs ago)`,
    )
    .join(', ');
  return [
    `_Recovered, not reported as findings:_ ${names} — spiked earlier in the week and back on the median since.`,
  ];
}

function countByStatus(cards) {
  return {
    worse: cards.filter((card) => card.status === STATUS.WORSE).length,
    rising: cards.filter((card) => card.status === STATUS.RISING).length,
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
  const [median, min, max] = formatDurationsAlike([
    current.medianJsWorkMs,
    current.minJsWorkMs,
    current.maxJsWorkMs,
  ]);
  const lines = [
    `*${statusLabel}* · *${displayName(card.scenario)}* ${mention}`,
    `_This week:_ ${current.runsObserved}/${current.runsTotal} runs · median JS work ${median} (${min} – ${max}) · JS duty ${current.medianJsDutyPct.toFixed(1)}%`,
  ];
  if (previous && previous.medianJsWorkMs > 0) {
    const ratio = (current.medianJsWorkMs / previous.medianJsWorkMs).toFixed(2);
    const [previousMedian, currentMedian] = formatDurationsAlike([
      previous.medianJsWorkMs,
      current.medianJsWorkMs,
    ]);
    lines.push(
      `_vs last week:_ median JS work ${previousMedian} → ${currentMedian} (${ratio}×)`,
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
    const age =
      current.runsAfterPeak > 0
        ? `, ${current.runsAfterPeak} runs before the end of the week`
        : ', the newest run of the week';
    lines.push(
      `_Peak:_ <${current.peakRunUrl}|${current.peakRunId}> at JS work ${formatDuration(current.maxJsWorkMs)} (${current.spikeRatio}× this week's median JS work${age})`,
    );
  }
  lines.push(`_Conclusion:_ ${conclusion}`);
  return lines.join('\n');
}

/**
 * Every duration in one slow-run card is read against the others, so they are
 * scaled together. Pair by pair, `15.6 s` and `8199.9 ms` end up in the same
 * list and the reader converts before they can rank the rows.
 */
function sharedSpikeDurations(sharedSpike) {
  const formatted = formatDurationsAlike(
    sharedSpike.scenarios.flatMap((scenario) => [
      scenario.maxJsWorkMs,
      scenario.medianJsWorkMs,
    ]),
  );
  return sharedSpike.scenarios.map((scenario, index) => ({
    scenario,
    peak: formatted[index * 2],
    weekly: formatted[index * 2 + 1],
  }));
}

export function buildSharedSpikeCard(sharedSpike) {
  // A recovered run is history: naming the owners is useful, paging them is
  // not, so only an open slow run uses live mentions.
  const owner = sharedSpike.recovered
    ? (scenario) => `· owner ${scenarioOwner(scenario)}`
    : (scenario) => scenarioOwnerMention(scenario);
  const lines = [
    `*Slow run${sharedSpike.recovered ? ' (recovered)' : ''}* · <${sharedSpike.runUrl}|${sharedSpike.runId}> peaked in ${sharedSpike.scenarios.length} scenarios`,
    `_Read as:_ one run-level anomaly, not ${sharedSpike.scenarios.length} scenario regressions. ${
      sharedSpike.recovered
        ? 'Owners are named for the record; no team is notified.'
        : 'Owning teams are tagged.'
    }`,
    '_Hermes JS work (sampled JS self time, not test duration) in that run vs the scenario median across this week:_',
  ];
  for (const { scenario, peak, weekly } of sharedSpikeDurations(sharedSpike)) {
    lines.push(
      `  *${displayName(scenario.scenario)}* — JS work ${peak} in that run vs ${weekly} weekly median (${scenario.spikeRatio}×) ${owner(scenario.scenario)}`,
    );
  }
  lines.push(
    sharedSpike.recovered
      ? '_Conclusion:_ every scenario above has run clean since that run, so read it as one bad run and not as pending work; worth a look only if the same run id keeps coming back.'
      : '_Conclusion:_ the runs since have not come back to the median, so check that run before opening any per-scenario work.',
  );
  return lines.join('\n');
}

export function weeklySlackCards(report) {
  return [
    ...(report.sharedSpikes || []).map((sharedSpike) =>
      buildSharedSpikeCard(sharedSpike),
    ),
    ...report.cards.map((card) => buildWeeklyScenarioCard(card)),
  ];
}

function openSharedSpikes(report) {
  return (report.sharedSpikes || []).filter((spike) => !spike.recovered);
}

function recoveredSharedSpikes(report) {
  return (report.sharedSpikes || []).filter((spike) => spike.recovered);
}

function hasNothingToAction(report) {
  return report.cards.length === 0 && openSharedSpikes(report).length === 0;
}

export function buildWeeklyParentSlack(report) {
  const counts = countByStatus(report.cards);
  const sharedSpikes = report.sharedSpikes || [];
  const recoveredSpikes = recoveredSharedSpikes(report);
  const lines = [
    '*Hermes CPU-profile weekly conclusions*',
    '',
    `_This week:_ ${report.meta.thisWeek.since.slice(0, 16)}Z → ${report.meta.thisWeek.until.slice(0, 16)}Z`,
    `_Previous week:_ ${report.meta.lastWeek.since.slice(0, 16)}Z → ${report.meta.lastWeek.until.slice(0, 16)}Z`,
    ...weeklyDaysWithDataLines(report),
    `_Runs analyzed:_ ${report.meta.thisWeekRunCount} this week · ${report.meta.lastWeekRunCount} previous week (scheduled \`main\` only)`,
    `_Profiles:_ ${report.meta.thisWeekProfileCount} this week · sourcemaps ${report.meta.thisWeekSymbolicatedProfileCount}/${report.meta.thisWeekProfileCount}`,
  ];
  if (hasNothingToAction(report)) {
    lines.push('', '*Nothing to action this week.*');
    if (recoveredSpikes.length === 0 && !(report.recovered || []).length) {
      lines.push(
        'No Hermes JS regressions were detected versus the previous week.',
      );
    } else {
      for (const sharedSpike of recoveredSpikes) {
        lines.push(
          `_Slow run:_ <${sharedSpike.runUrl}|${sharedSpike.runId}> was the peak of ${sharedSpike.scenarios.length} scenarios (up to ${sharedSpike.maxRatio}× their weekly median JS work); every one of them has run clean since.`,
        );
      }
      lines.push(...weeklyRecoveredLines(report));
      if (recoveredSpikes.length > 0) {
        lines.push(
          '_The recovered run is detailed in the thread for the record._',
        );
      }
    }
  } else {
    lines.push('');
    // An all-zero count line above real findings reads as "nothing found".
    if (report.cards.length > 0) {
      lines.push(
        `_Scenario findings:_ ${counts.worse} worse than last week · ${counts.rising} rising within the week · ${counts.spike} spike in the newest runs · ${counts.newFrame} new hot frame · ${counts.insufficient} insufficient data`,
      );
    } else {
      lines.push(
        '_No scenario regressed on its own this week; every flagged spike traces back to a single run._',
      );
    }
    for (const sharedSpike of sharedSpikes) {
      lines.push(
        `_Slow run:_ <${sharedSpike.runUrl}|${sharedSpike.runId}> was the peak of ${sharedSpike.scenarios.length} scenarios (up to ${sharedSpike.maxRatio}× their weekly median JS work), reported once instead of per scenario${sharedSpike.recovered ? '; every one of them has run clean since' : ''}.`,
      );
    }
    lines.push(
      '_Stable scenarios omitted. One card per finding follows in the thread._',
    );
    lines.push(...weeklyRecoveredLines(report));
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; BrowserStack app-profiling data excluded.',
    '_"JS work":_ JS self time attributed from those samples (GC, idle and native waits excluded) — not the wall-clock duration of the test.',
  );
  if (!report.meta.comparable) {
    lines.push(
      '_Caveat:_ no run from the previous week is still analyzable, so nothing here is a week-over-week comparison yet; only in-week spikes can be reported.',
    );
  }
  if (report.meta.sampled) {
    lines.push(
      `_Coverage:_ sampled ${report.meta.thisWeekRunCount}/${report.meta.thisWeekRunsAvailable} and ${report.meta.lastWeekRunCount}/${report.meta.lastWeekRunsAvailable} scheduled runs; medians come from those samples.`,
    );
  }
  return lines.join('\n');
}

export function buildWeeklyMarkdown(report) {
  const lines = [
    '# Hermes CPU-profile weekly conclusions',
    '',
    `This week: ${report.meta.thisWeek.since} → ${report.meta.thisWeek.until}`,
    `Previous week: ${report.meta.lastWeek.since} → ${report.meta.lastWeek.until}`,
    ...weeklyDaysWithDataMarkdown(report),
    `Runs analyzed: ${report.meta.thisWeekRunCount}/${report.meta.thisWeekRunsAvailable} this week · ${report.meta.lastWeekRunCount}/${report.meta.lastWeekRunsAvailable} previous week`,
    '',
  ];
  const sharedSpikes = report.sharedSpikes || [];
  const recovered = report.recovered || [];
  if (hasNothingToAction(report)) {
    lines.push('Nothing to action this week.');
    // Slack says the recovered run is kept "for the record", so the record
    // itself cannot stop at that sentence.
    if (sharedSpikes.length === 0 && recovered.length === 0) {
      lines.push(
        'No Hermes JS regressions were detected versus the previous week.',
        '',
      );
      return lines.join('\n');
    }
    lines.push('');
  }
  for (const sharedSpike of sharedSpikes) {
    lines.push(
      `## Slow run${sharedSpike.recovered ? ' (recovered)' : ''} — [${sharedSpike.runId}](${sharedSpike.runUrl}) peaked in ${sharedSpike.scenarios.length} scenarios`,
      '',
      'One run-level anomaly, not one regression per scenario. Numbers are Hermes JS work (sampled JS self time), not test duration.',
      '',
    );
    for (const { scenario, peak, weekly } of sharedSpikeDurations(
      sharedSpike,
    )) {
      lines.push(
        `- ${displayName(scenario.scenario)} — JS work ${peak} in that run vs ${weekly} weekly median (${scenario.spikeRatio}×), owner ${scenarioOwner(scenario.scenario)}`,
      );
    }
    if (sharedSpike.recovered) {
      lines.push(
        '',
        'Every scenario above has run clean since that run, so this is history, not pending work.',
      );
    }
    lines.push('');
  }
  for (const card of report.cards) {
    const [median, min, max] = formatDurationsAlike([
      card.current.medianJsWorkMs,
      card.current.minJsWorkMs,
      card.current.maxJsWorkMs,
    ]);
    lines.push(`## ${card.statusLabel} — ${displayName(card.scenario)}`);
    lines.push('');
    lines.push(
      `This week: ${card.current.runsObserved}/${card.current.runsTotal} runs, median JS work ${median} (range ${min} – ${max}), JS duty ${card.current.medianJsDutyPct.toFixed(1)}%.`,
    );
    if (card.previous) {
      lines.push(
        `Last week median JS work: ${formatDuration(card.previous.medianJsWorkMs)}.`,
      );
    }
    lines.push(`Conclusion: ${card.conclusion}`);
    lines.push('');
  }
  if (recovered.length > 0) {
    lines.push('## Recovered, not reported as findings', '');
    for (const item of recovered) {
      lines.push(
        `- ${displayName(item.scenario)} (${item.spikeRatio}×, ${item.runsAfterPeak} runs ago) — spiked earlier in the week and back on the median since.`,
      );
    }
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
  thisWeekDays = [],
  lastWeekDays = [],
}) {
  const collapsed = collapseSharedSpikes(
    classifyWeeklyScenarios(thisWindow, lastWindow),
  );
  const sharedSpikes = collapsed.sharedSpikes;
  // A spike the scenario has already run clean past is not a finding. It is
  // summarized in one line so the week is still accounted for.
  const cards = collapsed.cards.filter(
    (card) => card.status !== STATUS.RECOVERED,
  );
  const recovered = collapsed.cards.filter(
    (card) => card.status === STATUS.RECOVERED,
  );
  return {
    meta: {
      mode: 'weekly-conclusions',
      thisWeek: bounds.thisWeek,
      lastWeek: bounds.lastWeek,
      thisWeekDays,
      lastWeekDays,
      generatedAt: new Date().toISOString(),
      source: 'Hermes CPU sampling profiles only',
      thisWeekRunCount,
      lastWeekRunCount,
      thisWeekRunsAvailable,
      lastWeekRunsAvailable,
      sampled:
        thisWeekRunCount < thisWeekRunsAvailable ||
        lastWeekRunCount < lastWeekRunsAvailable,
      comparable: lastWeekRunCount > 0,
      thisWeekProfileCount: thisWindow.meta?.profileCount || 0,
      thisWeekSymbolicatedProfileCount:
        thisWindow.meta?.symbolicatedProfileCount || 0,
    },
    cards,
    sharedSpikes,
    recovered: recovered.map((card) => ({
      scenario: card.scenario,
      spikeRatio: card.current.spikeRatio,
      runsAfterPeak: card.current.runsAfterPeak,
      peakRunId: card.current.peakRunId,
      peakRunUrl: card.current.peakRunUrl,
    })),
  };
}
