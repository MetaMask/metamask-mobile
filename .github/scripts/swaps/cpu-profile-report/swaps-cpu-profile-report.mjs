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
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
/** GitHub markdown also renders HTML, `|` splits table cells, and a backslash escapes the next character. */
const escapeMd = (text) => escapeSlack(text).replace(/[\\|]/g, '\\$&');
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
const REPO_URL = 'https://github.com/MetaMask/metamask-mobile';
const NOT_NAMED = "the analysis doesn't name the function";

function weekOverWeek(current, previous) {
  if (!previous) {
    return 'no baseline yet';
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent < 0 ? 'down' : 'up'} ${Math.abs(percent)}% from ${formatMs(previous)} last week`;
}

/** "name in <link to its line on GitHub>", or null when the analysis doesn't name the function. */
function describeFunction(fn, escape, link) {
  if (!fn?.file?.startsWith('/app/')) {
    return null;
  }
  const file = fn.file.slice(1);
  const name = fn.name === 'anonymous' ? 'an anonymous function' : fn.name;
  const url = encodeURI(
    `${REPO_URL}/blob/${fn.commit || 'main'}/${file}#L${fn.line}`,
  );
  return `${escape(name)} in ${link(url, escape(`${file}:${fn.line}`))}`;
}
const slackFunction = (fn) =>
  describeFunction(fn, escapeSlack, (url, text) => `<${url}|${text}>`);
const markdownFunction = (fn) =>
  describeFunction(fn, escapeMd, (url, text) => `[${text}](${url})`) ??
  NOT_NAMED;

/** The explanation and, when runs were dropped, the coverage line; shared by the post and the full report. */
function footer(scenarios, { runsRead, runsFound, devices }, escape) {
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
  }
  return [
    `Widest span: how long the most expensive swaps function kept the JS thread busy in one run, counting the code it called. p90 is over this week's scheduled runs on main (${escape(devices.join(', ')) || 'device unknown'}).`,
    ...(coverage.length ? [`Coverage: ${coverage.join('; ')}.`] : []),
  ];
}

const lastWeekP90 = (previous, label) =>
  previous?.scenarios?.find((scenario) => scenario.label === label)?.summary
    ?.widestSpanMs?.p90;

/** The weekly post; `options.previous` is last week's saved summary, if any. */
export function buildSlackMessage(scenarios, options) {
  const { window, runUrl, previous } = options;
  const lines = [
    `:bar_chart: *Swaps CPU profile report, ${window.label}* (shadow mode, no flags)`,
  ];
  for (const { label, summary } of scenarios) {
    if (!summary.widestSpanMs) {
      lines.push(`*${label}*: no usable runs this week.`);
      continue;
    }
    const p90 = summary.widestSpanMs.p90;
    const fn = slackFunction(summary.widestFunction);
    lines.push(
      `*${label}*: widest span ${formatMs(p90)} at p90, ${weekOverWeek(p90, lastWeekP90(previous, label))}; ${fn ? `from ${fn}` : NOT_NAMED}.`,
    );
  }
  lines.push('', ...footer(scenarios, options, escapeSlack));
  if (runUrl) {
    lines.push(`<${runUrl}|Full report>`);
  }
  return lines.join('\n');
}

const table = (header, rows) =>
  [header, header.map(() => '---'), ...rows]
    .map((cells) => `| ${cells.join(' | ')} |`)
    .join('\n');

/** Every number behind the Slack post, for the workflow run page. */
export function buildFullReport(scenarios, options) {
  const lines = [
    `## Swaps CPU profile report, ${options.window.label}`,
    '',
    ...footer(scenarios, options, escapeMd).flatMap((line) => [line, '']),
    'Own time is the time spent in swaps functions themselves, without the code they called. Areas show average own time per run. "Called by swaps" is an upper bound: a function swaps calls even once counts with all its own time.',
  ];
  for (const { label, summary } of scenarios) {
    lines.push('', `### ${label}`, '');
    if (!summary.widestSpanMs) {
      lines.push('No usable runs this week.');
      continue;
    }
    const { widestSpanMs: widest, ownedSelfMs: own } = summary;
    lines.push(
      `- Widest span: median ${formatMs(widest.median)}, p90 ${formatMs(widest.p90)}, ${weekOverWeek(widest.p90, lastWeekP90(options.previous, label))}; at p90, ${markdownFunction(summary.widestFunction)}.`,
      `- Swaps own time: median ${formatMs(own.median)}, p90 ${formatMs(own.p90)}.`,
    );
    for (const [field, title] of AREA_GROUPS) {
      lines.push(
        '',
        table(
          [title, 'Average per run'],
          summary[field]
            .slice(0, 10)
            .map(({ area, avgMs }) => [
              escapeMd(AREA_NAMES.get(area) ?? area),
              formatMs(avgMs),
            ]),
        ),
      );
    }
    lines.push(
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
