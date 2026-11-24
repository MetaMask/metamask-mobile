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
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * fraction;
  const low = Math.floor(rank);
  const high = Math.min(low + 1, sorted.length - 1);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

/** The analyzer keys scenarios on the profile file name derived from the test title. */
const scenarioKey = (testName) => testName.replace(/[^a-zA-Z0-9._-]/g, '_');

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
 * stop before the swap and would read as near-zero swaps time. A run with any
 * segment the analyzer couldn't audit is dropped too, since its total would be
 * partial. The analyzer reports one entry per device and scenario, so more than
 * one match (several devices) is dropped as ambiguous.
 */
export function scenarioSample(report, failed, { testName }) {
  if (failed.has(testName)) {
    return { status: 'failed' };
  }
  const entries = (report.scenarios || []).filter(
    (scenario) => scenario.scenario === scenarioKey(testName),
  );
  if (entries.length !== 1) {
    return { status: entries.length ? 'ambiguous' : 'missing' };
  }
  const profiles = entries[0].profiles || [];
  const audited = profiles.every(
    (profile) => profile.symbolicated && profile.skillAudit,
  );
  return profiles.length && audited
    ? {
        status: 'used',
        audit: mergeSegments(
          profiles.map((profile) => profile.skillAudit),
          report.meta?.headSha,
        ),
      }
    : { status: 'unsymbolicated' };
}

/** The swaps function behind a segment's widest span; the analyzer only lists functions with time of their own, so it can be missing. */
function widestFunction(audit, commit) {
  const frame = (audit.topSwapsFrames || []).find(
    (candidate) =>
      Math.abs(candidate.inclusiveMs - audit.swapsWidestInclusiveMs) < 0.5,
  );
  return frame
    ? { name: frame.name, file: frame.url, line: frame.line, commit }
    : null;
}

/** A capture can span several Hermes segments: self time and areas add up, the widest span is the largest. */
function mergeSegments(audits, commit) {
  const concat = (field) => audits.flatMap((audit) => audit[field] || []);
  const widest = audits.reduce((a, b) =>
    (b.swapsWidestInclusiveMs || 0) > (a.swapsWidestInclusiveMs || 0) ? b : a,
  );
  return {
    swapsOwnedSelfMs: audits.reduce(
      (total, audit) => total + (audit.swapsOwnedSelfMs || 0),
      0,
    ),
    swapsWidestInclusiveMs: widest.swapsWidestInclusiveMs || 0,
    widestFunction: widestFunction(widest, commit),
    swapsOwnedAreas: concat('swapsOwnedAreas'),
    nonSwapsOnPathAreas: concat('nonSwapsOnPathAreas'),
    nonSwapsConcurrentAreas: concat('nonSwapsConcurrentAreas'),
  };
}

/** Areas by average self time per run, largest first; a run without the area counts as 0. */
function areaAverages(audits, field) {
  const totals = new Map();
  for (const audit of audits) {
    for (const { area, selfMs } of audit[field] || []) {
      totals.set(area, (totals.get(area) || 0) + (selfMs || 0));
    }
  }
  return [...totals]
    .map(([area, total]) => ({ area, avgMs: total / audits.length }))
    .filter(({ avgMs }) => avgMs > 0)
    .sort((a, b) => b.avgMs - a.avgMs);
}

export function summarizeScenario(samples) {
  const counts = {
    used: 0,
    failed: 0,
    unsymbolicated: 0,
    missing: 0,
    ambiguous: 0,
  };
  samples.forEach((sample) => {
    counts[sample.status] += 1;
  });
  const used = samples.filter((sample) => sample.status === 'used');
  const audits = used.map((sample) => sample.audit);
  if (audits.length === 0) {
    return { counts };
  }
  const runs = used.map(({ runId, audit }) => ({
    runId,
    widestSpanMs: audit.swapsWidestInclusiveMs || 0,
    ownedSelfMs: audit.swapsOwnedSelfMs || 0,
    widestFunction: audit.widestFunction,
  }));
  const stats = (values) => ({
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
  });
  const widestSpanMs = stats(runs.map((run) => run.widestSpanMs));
  const distance = (run) => Math.abs(run.widestSpanMs - widestSpanMs.p90);
  const p90Run = runs.reduce((a, b) => (distance(b) < distance(a) ? b : a));
  return {
    counts,
    runs,
    widestSpanMs,
    widestFunction: p90Run.widestFunction,
    ownedSelfMs: stats(runs.map((run) => run.ownedSelfMs)),
    ownedAreas: areaAverages(audits, 'swapsOwnedAreas'),
    calledBySwaps: areaAverages(audits, 'nonSwapsOnPathAreas'),
    coRunning: areaAverages(audits, 'nonSwapsConcurrentAreas'),
  };
}

/** Slack reads `<`, `>` and `&` as markup, so text taken from run artifacts is escaped. */
const escapeSlack = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const formatMs = (value) => `${Math.round(value).toLocaleString('en-US')}ms`;
/**
 * Clearer names for two parser areas: frames without a source path (in
 * symbolicated profiles, mostly native and host functions), and `@expo/cli`,
 * whose only runtime code is Metro's module loader.
 */
const AREA_NAMES = new Map([
  ['Unknown (unsymbolicated)', 'Native or no source path'],
  ['@expo/cli (dependency)', 'Metro module loading (@expo/cli)'],
]);
const AREA_GROUPS = [
  ['ownedAreas', 'Swaps code'],
  ['calledBySwaps', 'Called by swaps (upper bound)'],
  ['coRunning', 'Running alongside, not Swaps'],
];
const DROP_REASONS = [
  ['failed', 'failed before measuring'],
  ['unsymbolicated', 'had unreadable profiles'],
  ['missing', 'had no profile'],
  ['ambiguous', 'matched more than one device'],
];
const SPAN_EXPLAINED =
  'Widest span: how long the most expensive swaps function kept the JS thread busy in one run, counting the code it called.';
const movedNotably = (current, previous) =>
  Math.abs(current - previous) >= Math.max(previous * 0.25, 20);

function weekOverWeek(current, previous) {
  if (!previous) {
    return 'no baseline yet';
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent < 0 ? 'down' : 'up'} ${Math.abs(percent)}% from ${formatMs(previous)} last week`;
}

const REPO_URL = 'https://github.com/MetaMask/metamask-mobile';
const NOT_NAMED = "the analysis doesn't name the function";

/** The function's name and a GitHub link to its line, or null when the analysis doesn't name it. */
function functionLink(fn) {
  if (!fn?.file?.startsWith('/app/')) {
    return null;
  }
  const file = fn.file.slice(1);
  return {
    name: fn.name === 'anonymous' ? 'an anonymous function' : fn.name,
    text: `${file}:${fn.line}`,
    url: encodeURI(
      `${REPO_URL}/blob/${fn.commit || 'main'}/${file}#L${fn.line}`,
    ),
  };
}

function describeFunction(fn) {
  const link = functionLink(fn);
  if (!link) {
    return NOT_NAMED;
  }
  const name =
    fn.name === 'anonymous' ? link.name : `\`${escapeSlack(link.name)}\``;
  return `from ${name} in <${link.url}|${escapeSlack(link.text)}>`;
}

/** Breakdown lines for what moved notably since last week; none without a baseline. */
function movedSinceLastWeek(summary, previous) {
  if (!previous?.widestSpanMs) {
    return [];
  }
  const lines = AREA_GROUPS.flatMap(([field, title]) => {
    const before = new Map(
      (previous[field] || []).map(({ area, avgMs }) => [area, avgMs]),
    );
    const moved = summary[field]
      .slice(0, 3)
      .filter(({ area, avgMs }) => movedNotably(avgMs, before.get(area) ?? 0))
      .map(
        ({ area, avgMs }) =>
          `${escapeSlack(AREA_NAMES.get(area) ?? area)} ${formatMs(avgMs)} (was ${formatMs(before.get(area) ?? 0)})`,
      );
    return moved.length ? [`${title}: ${moved.join(', ')}`] : [];
  });
  const self = summary.ownedSelfMs.p90;
  const selfBefore = previous.ownedSelfMs.p90;
  if (movedNotably(self, selfBefore)) {
    lines.push(
      `Time in swaps code itself: ${formatMs(self)} at p90 (was ${formatMs(selfBefore)})`,
    );
  }
  return lines;
}

/**
 * @param {{ label: string, summary: object }[]} scenarios
 * @param {{ window: { label: string }, runsRead: number, runsFound: number, devices: string[], runUrl?: string, previous?: object | null }} options - `previous` is last week's saved summary, if any.
 */
export function buildSlackMessage(
  scenarios,
  { window, runsRead, runsFound, devices, runUrl = '', previous },
) {
  const lines = [
    `:bar_chart: *Swaps CPU profile report, ${window.label}* (shadow mode, no flags)`,
  ];
  const coverage =
    runsRead < runsFound
      ? [`${runsFound - runsRead} of ${runsFound} runs had no profile analysis`]
      : [];
  for (const { label, summary } of scenarios) {
    const total = Object.values(summary.counts).reduce((a, b) => a + b, 0);
    DROP_REASONS.forEach(([status, reason]) => {
      if (summary.counts[status]) {
        coverage.push(
          `${label}: ${summary.counts[status]} of ${total} runs ${reason}`,
        );
      }
    });
    if (!summary.widestSpanMs) {
      lines.push(`*${label}*: no usable runs this week.`);
      continue;
    }
    const before = previous?.scenarios?.find(
      (scenario) => scenario.label === label,
    )?.summary;
    const p90 = summary.widestSpanMs.p90;
    lines.push(
      `*${label}*: widest span ${formatMs(p90)} at p90, ${weekOverWeek(p90, before?.widestSpanMs?.p90)}; ${describeFunction(summary.widestFunction)}.`,
      ...movedSinceLastWeek(summary, before),
    );
  }
  lines.push(
    '',
    `${SPAN_EXPLAINED} p90 is over this week's scheduled runs on main (${escapeSlack(devices.join(', ')) || 'device unknown'}).`,
  );
  if (coverage.length) {
    lines.push(`Coverage: ${coverage.join('; ')}.`);
  }
  if (runUrl) {
    lines.push(`<${runUrl}|Full report>`);
  }
  return lines.join('\n');
}

/** Markdown for the run page: GitHub renders HTML and `|` splits table cells, so artifact text is escaped. */
const escapeMd = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|');
const table = (header, rows) =>
  [header, header.map(() => '---'), ...rows]
    .map((cells) => `| ${cells.join(' | ')} |`)
    .join('\n');

function markdownFunction(fn) {
  const link = functionLink(fn);
  return link
    ? `${escapeMd(link.name)} in [${escapeMd(link.text)}](${link.url})`
    : NOT_NAMED;
}

/**
 * Every number behind the Slack post, for the workflow run page.
 *
 * @param {{ label: string, summary: object }[]} scenarios
 * @param {{ window: { label: string }, runsRead: number, runsFound: number, devices: string[], previous?: object | null }} options
 */
export function buildFullReport(
  scenarios,
  { window, runsRead, runsFound, devices, previous },
) {
  const lines = [
    `## Swaps CPU profile report, ${window.label}`,
    '',
    `Shadow mode, no flags. Read ${runsRead} of ${runsFound} scheduled performance runs on main (${escapeMd(devices.join(', ')) || 'device unknown'})${runsRead < runsFound ? `; ${runsFound - runsRead} had no profile analysis` : ''}.`,
    '',
    `${SPAN_EXPLAINED} Own time is the time spent in swaps functions themselves, without the code they called. Areas show average own time per run. "Called by swaps" is an upper bound: a function swaps calls even once counts with all its own time.`,
  ];
  for (const { label, summary } of scenarios) {
    const before = previous?.scenarios?.find(
      (scenario) => scenario.label === label,
    )?.summary;
    const total = Object.values(summary.counts).reduce((a, b) => a + b, 0);
    const dropped = DROP_REASONS.filter(([status]) => summary.counts[status])
      .map(([status, reason]) => `${summary.counts[status]} ${reason}`)
      .join(', ');
    lines.push(
      '',
      `### ${label}`,
      '',
      `Used ${summary.counts.used} of ${total} runs${dropped ? `; ${dropped}` : ''}.`,
    );
    if (!summary.widestSpanMs) {
      continue;
    }
    const lastWeek = (field) =>
      before?.[field] ? formatMs(before[field].p90) : 'no baseline yet';
    lines.push(
      '',
      table(
        ['', 'Median', 'p90', 'Last week p90'],
        [
          ['widestSpanMs', 'Widest span'],
          ['ownedSelfMs', 'Swaps own time'],
        ].map(([field, name]) => [
          name,
          formatMs(summary[field].median),
          formatMs(summary[field].p90),
          lastWeek(field),
        ]),
      ),
      '',
      `Widest span at p90: ${markdownFunction(summary.widestFunction)}.`,
    );
    for (const [field, title] of AREA_GROUPS) {
      const beforeAreas = new Map(
        (before?.[field] || []).map(({ area, avgMs }) => [area, avgMs]),
      );
      lines.push(
        '',
        `**${title}**`,
        '',
        table(
          ['Area', 'Average per run', 'Last week'],
          summary[field]
            .slice(0, 10)
            .map(({ area, avgMs }) => [
              escapeMd(AREA_NAMES.get(area) ?? area),
              formatMs(avgMs),
              before ? formatMs(beforeAreas.get(area) ?? 0) : '–',
            ]),
        ),
      );
    }
    lines.push(
      '',
      '**Per run**',
      '',
      table(
        ['Run', 'Widest span', 'Swaps own time', 'Widest function'],
        summary.runs.map((run) => [
          `[${run.runId}](${REPO_URL}/actions/runs/${run.runId})`,
          formatMs(run.widestSpanMs),
          formatMs(run.ownedSelfMs),
          markdownFunction(run.widestFunction),
        ]),
      ),
    );
  }
  return `${lines.join('\n')}\n`;
}
