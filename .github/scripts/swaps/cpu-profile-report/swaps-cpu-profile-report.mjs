/**
 * Weekly Swaps CPU profile report: per swap scenario, the swaps breakdown
 * (`skillAudit`) that the app-profiling analysis writes to each scheduled
 * run's `report.json`, over the previous UTC week. Shadow mode: no flags.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The previous complete UTC week, Monday 00:00 to Monday 00:00. */
export function lastWeek(now = new Date()) {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const end = new Date(today - ((now.getUTCDay() + 6) % 7) * DAY_MS);
  const start = new Date(end.getTime() - 7 * DAY_MS);
  const last = new Date(end.getTime() - DAY_MS);
  const label = `${start.toISOString().slice(0, 10)} – ${last.toISOString().slice(0, 10)} UTC`;
  return { start, end, label };
}

/** Linear interpolation between the closest ranks. */
export function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * fraction;
  const low = Math.floor(rank);
  const high = Math.min(low + 1, sorted.length - 1);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

/** The analyzer keys scenarios on the profile file name derived from the test title. */
export const scenarioKey = (testName) =>
  testName.replace(/[^a-zA-Z0-9._-]/g, '_');

/** Titles of the tests that failed in a run, from `summary.json` in `aggregated-reports`; a test only over its quality gates completed the swap, so it is kept. */
export function failedTestNames(summary) {
  const teams = Object.values(
    summary?.failedTestsStats?.failedTestsByTeam || {},
  );
  return new Set(
    teams.flatMap((team) =>
      (team.tests || [])
        .filter((test) => test.failureReason !== 'quality_gates_exceeded')
        .map((test) => test.testName),
    ),
  );
}

/**
 * One run's sample for a scenario. A failed test is dropped: its profile can
 * stop before the swap and would read as near-zero swaps time.
 */
export function scenarioSample(report, failed, { testName }) {
  const entry = report.scenarios?.find(
    (scenario) => scenario.scenario === scenarioKey(testName),
  );
  if (!entry) {
    return { status: 'missing' };
  }
  if (failed.has(testName)) {
    return { status: 'failed' };
  }
  const audits = (entry.profiles || [])
    .filter(
      (profile) =>
        profile.symbolicated &&
        profile.skillAudit &&
        !profile.skillAudit.caveat,
    )
    .map((profile) => profile.skillAudit);
  return audits.length
    ? { status: 'used', audit: mergeSegments(audits) }
    : { status: 'unsymbolicated' };
}

/** A capture can span several Hermes segments: self time and areas add up, the widest span is the largest. */
function mergeSegments(audits) {
  const concat = (field) => audits.flatMap((audit) => audit[field] || []);
  return {
    swapsOwnedSelfMs: audits.reduce(
      (total, audit) => total + (audit.swapsOwnedSelfMs || 0),
      0,
    ),
    swapsWidestInclusiveMs: Math.max(
      ...audits.map((audit) => audit.swapsWidestInclusiveMs || 0),
    ),
    swapsOwnedAreas: concat('swapsOwnedAreas'),
    nonSwapsOnPathAreas: concat('nonSwapsOnPathAreas'),
    nonSwapsConcurrentAreas: concat('nonSwapsConcurrentAreas'),
  };
}

/** The three areas with the most self time per run on average; a run without the area counts as 0. */
function topAreas(audits, field) {
  const totals = new Map();
  for (const audit of audits) {
    for (const { area, selfMs } of audit[field] || []) {
      totals.set(area, (totals.get(area) || 0) + (selfMs || 0));
    }
  }
  return [...totals]
    .map(([area, total]) => ({ area, avgMs: total / audits.length }))
    .filter(({ avgMs }) => avgMs > 0)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 3);
}

export function summarizeScenario(samples) {
  const counts = { used: 0, failed: 0, unsymbolicated: 0, missing: 0 };
  samples.forEach((sample) => {
    counts[sample.status] += 1;
  });
  const audits = samples
    .filter((sample) => sample.status === 'used')
    .map((sample) => sample.audit);
  if (audits.length === 0) {
    return { counts };
  }
  const runs = audits.map((audit) => ({
    widestSpanMs: audit.swapsWidestInclusiveMs || 0,
    ownedSelfMs: audit.swapsOwnedSelfMs || 0,
  }));
  const stats = (field) => ({
    median: percentile(
      runs.map((run) => run[field]),
      0.5,
    ),
    p90: percentile(
      runs.map((run) => run[field]),
      0.9,
    ),
  });
  return {
    counts,
    runs,
    widestSpanMs: stats('widestSpanMs'),
    ownedSelfMs: stats('ownedSelfMs'),
    ownedAreas: topAreas(audits, 'swapsOwnedAreas'),
    calledBySwaps: topAreas(audits, 'nonSwapsOnPathAreas'),
    coRunning: topAreas(audits, 'nonSwapsConcurrentAreas'),
  };
}

const formatMs = (value) => `${Math.round(value).toLocaleString('en-US')}ms`;
const formatAreas = (areas) =>
  areas.length
    ? areas.map(({ area, avgMs }) => `${area} ${formatMs(avgMs)}`).join(', ')
    : 'none';

export function buildSlackMessage(
  scenarios,
  { window, runsRead, runsFound, runUrl = '' },
) {
  const lines = [
    `:bar_chart: *Swaps CPU profile report, ${window.label}*`,
    `Shadow mode: numbers only, no flags. Read ${runsRead} of ${runsFound} scheduled performance runs on main (Pixel 8 Pro). Areas show average self time per run.`,
  ];
  for (const { label, summary } of scenarios) {
    const { used, failed, unsymbolicated, missing } = summary.counts;
    lines.push(
      '',
      `*${label}*: ${used} runs used (${failed} failed, ${unsymbolicated} unsymbolicated, ${missing} missing)`,
    );
    if (!summary.widestSpanMs) {
      lines.push('No passing, symbolicated runs this week.');
      continue;
    }
    const { widestSpanMs: widest, ownedSelfMs: self } = summary;
    lines.push(
      `Widest swaps-owned span: median ${formatMs(widest.median)} · p90 ${formatMs(widest.p90)}`,
      `Swaps-owned self time: median ${formatMs(self.median)} · p90 ${formatMs(self.p90)}`,
      `Top swaps areas: ${formatAreas(summary.ownedAreas)}`,
      `Called by swaps: ${formatAreas(summary.calledBySwaps)}`,
      `Co-running, not Swaps: ${formatAreas(summary.coRunning)}`,
    );
  }
  if (runUrl) {
    lines.push('', `<${runUrl}|Run log>`);
  }
  return lines.join('\n');
}
