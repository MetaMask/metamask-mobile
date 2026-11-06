#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Swaps performance budgets: daily check.
 *
 * For each rule in `swaps-perf-budgets.config.mjs`, queries Sentry for the
 * p90 and sample count of the last 14 complete Europe/Berlin days, and of the
 * same window one day earlier. A rule breaches when p90 > guardrail with at
 * least MIN_SAMPLES samples. Comparing today's window with yesterday's makes
 * the posting stateless:
 *   - triggered: breaching today, not yesterday
 *   - resolved: within the guardrail today, breaching yesterday
 *   - not evaluable: too few samples (or a partial scan) today, evaluable
 *     yesterday
 * Anything else posts nothing. Every result is in the job summary.
 *
 * Per-release check (rules with `perRelease`): the newest version with
 * samples in the last RELEASE_LOOKBACK_DAYS against the version before it,
 * over the same dates (the newer version's first sampled span to 00:00
 * today). It is flagged when both have MIN_SAMPLES and the newer p90 exceeds
 * the previous by more than the rule's headroom; posted on the first day it
 * is flagged.
 *
 * Usage:
 *   node .github/scripts/qa-automation/performance-tests/swaps-perf-budgets.mjs
 *
 * Environment:
 *   SWAPS_SENTRY_TOKEN        required; read-only (org:read) Sentry token
 *   SWAPS_PERF_SLACK_WEBHOOK  required unless DRY_RUN; Slack incoming webhook
 *   DRY_RUN                   `true` logs the Slack message instead of posting
 *   AS_OF                     optional YYYY-MM-DD; evaluate as if run that
 *                             day (window ends at 00:00 Europe/Berlin)
 *   SWAPS_ONCALL_SLACK_GROUP_ID  optional; mentioned on triggers and flags
 *   SENTRY_API_BASE           optional; defaults to https://sentry.io
 *   GITHUB_RUN_URL            optional footer link
 *   GITHUB_STEP_SUMMARY       set by GitHub Actions; the results table
 *
 * Exits 1 when any Sentry query failed, after posting the other results.
 */

import fs from 'fs';
import {
  BUDGET_RULES,
  EXCLUDE_TIMEOUTS,
  MIN_SAMPLES,
  RELEASE_LOOKBACK_DAYS,
  TIME_ZONE,
  TIMEOUT_MS,
  WINDOW_DAYS,
} from './swaps-perf-budgets.config.mjs';

export const SENTRY_ORG = 'metamask';
const DEFAULT_SENTRY_API_BASE = 'https://sentry.io';
const P90_FIELD = 'p90(span.duration)';
const COUNT_FIELD = 'count_sample()';
const FIRST_SEEN_FIELD = 'min(timestamp)';
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Calendar dates in Europe/Berlin
// ---------------------------------------------------------------------------

/** A calendar date as `{ year, month, day }`, month 1-12. */
export function calendarDateIn(instant, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type) =>
    Number(parts.find((part) => part.type === type).value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function parseCalendarDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
  if (!match) {
    throw new Error(`AS_OF must be YYYY-MM-DD, got "${text}"`);
  }
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const check = addDays(date, 0);
  if (check.month !== date.month || check.day !== date.day) {
    throw new Error(`AS_OF is not a calendar date: "${text}"`);
  }
  return date;
}

export function addDays({ year, month, day }, days) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function offsetMinutesAt(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const value = (type) =>
    Number(parts.find((part) => part.type === type).value);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** The UTC instant of 00:00 on `date` in `timeZone`. */
export function midnightIn(date, timeZone = TIME_ZONE) {
  const naive = Date.UTC(date.year, date.month - 1, date.day);
  let instant = new Date(naive - offsetMinutesAt(new Date(naive), timeZone) * 60_000);
  // A second pass settles the offset when a DST change falls within it.
  instant = new Date(naive - offsetMinutesAt(instant, timeZone) * 60_000);
  return instant;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortDate({ month, day }) {
  return `${MONTHS[month - 1]} ${day}`;
}

/**
 * The `days` complete days ending at 00:00 on `endDate`. `label` names the
 * first and last included day.
 */
export function windowEndingOn(endDate, days = WINDOW_DAYS, timeZone = TIME_ZONE) {
  const startDate = addDays(endDate, -days);
  return {
    start: midnightIn(startDate, timeZone),
    end: midnightIn(endDate, timeZone),
    label: `${shortDate(startDate)} – ${shortDate(addDays(endDate, -1))}`,
  };
}

// ---------------------------------------------------------------------------
// Sentry
// ---------------------------------------------------------------------------

export function ruleQuery(rule, { excludeTimeouts = EXCLUDE_TIMEOUTS } = {}) {
  return excludeTimeouts
    ? `${rule.query} span.duration:<${TIMEOUT_MS}`
    : rule.query;
}

function isoSeconds(instant) {
  return instant.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function exploreTime(instant) {
  return instant.toISOString().slice(0, 19);
}

/** The Explore view of `query` over `start`…`end`, for Slack links. */
export function exploreUrl({ projectId, query, start, end }) {
  const params = new URLSearchParams({
    query,
    project: projectId,
    aggregateField: JSON.stringify({ yAxes: [COUNT_FIELD, P90_FIELD] }),
    mode: 'aggregate',
    start: exploreTime(start),
    end: exploreTime(end),
    utc: 'true',
    table: 'span',
  });
  return `https://${SENTRY_ORG}.sentry.io/explore/traces/?${params}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/0/organizations/{org}/events/ on the spans dataset.
 * `sampling=HIGHEST_ACCURACY` asks for a full scan; the response's
 * `meta.dataScanned` says whether it got one.
 */
export async function querySpans(
  { projectId, query, start, end, fields, sort, perPage = 1 },
  {
    token,
    apiBase = DEFAULT_SENTRY_API_BASE,
    fetchFn = fetch,
    retryDelayMs = 2_000,
  },
) {
  const params = new URLSearchParams();
  params.set('dataset', 'spans');
  params.set('project', projectId);
  for (const field of fields) {
    params.append('field', field);
  }
  params.set('query', query);
  params.set('start', isoSeconds(start));
  params.set('end', isoSeconds(end));
  params.set('sampling', 'HIGHEST_ACCURACY');
  params.set('per_page', String(perPage));
  if (sort) {
    params.set('sort', sort);
  }
  const url = `${apiBase}/api/0/organizations/${SENTRY_ORG}/events/?${params}`;

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchFn(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const body = await response.json();
      return {
        rows: Array.isArray(body.data) ? body.data : [],
        fullScan: body.meta?.dataScanned !== 'partial',
      };
    }
    if (attempt >= MAX_ATTEMPTS || !RETRY_STATUSES.has(response.status)) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Sentry events API HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }
    await sleep(retryDelayMs * attempt);
  }
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function measure(rule, window, sentry, extraQuery = '') {
  const query = `${ruleQuery(rule)}${extraQuery ? ` ${extraQuery}` : ''}`;
  const { rows, fullScan } = await querySpans(
    {
      projectId: rule.projectId,
      query,
      start: window.start,
      end: window.end,
      fields: [COUNT_FIELD, P90_FIELD],
    },
    sentry,
  );
  const row = rows[0] || {};
  return {
    p90: numberOrNull(row[P90_FIELD]),
    n: numberOrNull(row[COUNT_FIELD]) ?? 0,
    fullScan,
    url: exploreUrl({
      projectId: rule.projectId,
      query,
      start: window.start,
      end: window.end,
    }),
  };
}

// ---------------------------------------------------------------------------
// Budget rules
// ---------------------------------------------------------------------------

export const STATUS = {
  BREACH: 'breach',
  OK: 'ok',
  NOT_EVALUABLE: 'not-evaluable',
};

export function budgetStatus(
  { p90, n, fullScan },
  guardrailMs,
  minSamples = MIN_SAMPLES,
) {
  if (!fullScan || n < minSamples || p90 === null) {
    return STATUS.NOT_EVALUABLE;
  }
  return p90 > guardrailMs ? STATUS.BREACH : STATUS.OK;
}

export function notEvaluableReason({ n, fullScan }, minSamples = MIN_SAMPLES) {
  if (!fullScan) {
    return 'Sentry scanned only part of the data';
  }
  return `n=${formatCount(n)}, below ${formatCount(minSamples)}`;
}

/** What to post, from today's and yesterday's status; null posts nothing. */
export function budgetTransition(today, yesterday) {
  if (today === STATUS.BREACH && yesterday !== STATUS.BREACH) {
    return 'triggered';
  }
  if (today === STATUS.OK && yesterday === STATUS.BREACH) {
    return 'resolved';
  }
  if (today === STATUS.NOT_EVALUABLE && yesterday !== STATUS.NOT_EVALUABLE) {
    return 'not-evaluable';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-release check
// ---------------------------------------------------------------------------

/** `io.metamask@8.18.0+7523` → `8.18.0`; anything else → null. */
export function releaseVersion(release) {
  const match = /@(\d+)\.(\d+)\.(\d+)(?:\+[^@]*)?$/.exec(String(release || ''));
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

export function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index];
    }
  }
  return 0;
}

function toInstant(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Seconds unless clearly milliseconds.
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  const parsed = Date.parse(String(value || ''));
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

/**
 * Groups release rows (`release`, `min(timestamp)`) by version, so builds of
 * one version count together. Returns versions newest first, each with its
 * releases and its first sampled span.
 */
export function versionsFromReleaseRows(rows) {
  const versions = new Map();
  for (const row of rows) {
    const version = releaseVersion(row.release);
    const firstSeen = toInstant(row[FIRST_SEEN_FIELD]);
    if (!version || !firstSeen) {
      continue;
    }
    const entry = versions.get(version) || {
      version,
      releases: [],
      firstSeen,
    };
    entry.releases.push(row.release);
    if (firstSeen < entry.firstSeen) {
      entry.firstSeen = firstSeen;
    }
    versions.set(version, entry);
  }
  return [...versions.values()].sort((left, right) =>
    compareVersions(right.version, left.version),
  );
}

export function releaseFilter(releases) {
  return `release:[${releases.map((release) => JSON.stringify(release)).join(',')}]`;
}

/** Flagged when both have enough samples and the gap exceeds the headroom. */
export function releaseFlagged(newer, previous, headroom, minSamples = MIN_SAMPLES) {
  if (
    !newer.fullScan ||
    !previous.fullScan ||
    newer.n < minSamples ||
    previous.n < minSamples ||
    newer.p90 === null ||
    previous.p90 === null ||
    previous.p90 <= 0
  ) {
    return { evaluable: false, flagged: false, gap: null };
  }
  const gap = newer.p90 / previous.p90 - 1;
  return { evaluable: true, flagged: gap > headroom, gap };
}

async function checkRelease(rule, todayEnd, yesterdayEnd, lookback, sentry) {
  const { rows } = await querySpans(
    {
      projectId: rule.projectId,
      query: ruleQuery(rule),
      start: lookback.start,
      end: lookback.end,
      fields: ['release', COUNT_FIELD, FIRST_SEEN_FIELD],
      sort: `-${COUNT_FIELD}`,
      perPage: 100,
    },
    sentry,
  );
  const [newer, previous] = versionsFromReleaseRows(rows);
  if (!newer || !previous) {
    return { rule, skipped: 'fewer than two versions with samples' };
  }

  const compareUntil = async (end) => {
    if (newer.firstSeen >= end) {
      return null;
    }
    const window = { start: newer.firstSeen, end };
    const [newerResult, previousResult] = await Promise.all([
      measure(rule, window, sentry, releaseFilter(newer.releases)),
      measure(rule, window, sentry, releaseFilter(previous.releases)),
    ]);
    return {
      window,
      newer: newerResult,
      previous: previousResult,
      ...releaseFlagged(newerResult, previousResult, rule.releaseHeadroom),
    };
  };

  const today = await compareUntil(todayEnd);
  const yesterday = await compareUntil(yesterdayEnd);
  return {
    rule,
    newerVersion: newer.version,
    previousVersion: previous.version,
    today,
    post: Boolean(today?.flagged) && !yesterday?.flagged,
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function formatCount(value) {
  return Math.round(value).toLocaleString('en-US');
}

function formatMs(value) {
  return value === null ? 'n/a' : `${formatCount(value)}ms`;
}

function formatPercent(value) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function formatDateTimeIn(instant, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

export function budgetLine(result) {
  const { rule, today, transition, window } = result;
  const link = `<${today.url}|${window.label}>`;
  if (transition === 'not-evaluable') {
    return `• *${rule.label}*: not evaluable (${notEvaluableReason(today)}) · p90 ${formatMs(today.p90)} · ${link}`;
  }
  const comparison = transition === 'triggered' ? '>' : '≤';
  return `• *${rule.label}*: p90 ${formatMs(today.p90)} ${comparison} guardrail ${formatMs(rule.guardrailMs)} (n=${formatCount(today.n)}) · ${link}`;
}

export function releaseLine(result) {
  const { rule, today, newerVersion, previousVersion } = result;
  return `• *${rule.label}*: ${newerVersion} p90 ${formatMs(today.newer.p90)} (n=${formatCount(today.newer.n)}) vs ${previousVersion} ${formatMs(today.previous.p90)} (n=${formatCount(today.previous.n)}), ${formatPercent(today.gap)} > ${formatPercent(rule.releaseHeadroom)} headroom · same dates from ${formatDateTimeIn(today.window.start)} Europe/Berlin · <${today.newer.url}|${newerVersion}> <${today.previous.url}|${previousVersion}>`;
}

/** The Slack message for this run, or null when nothing changed. */
export function buildSlackMessage(
  { budgets, releases },
  { mentionGroupId = '', runUrl = '' } = {},
) {
  const byTransition = (transition) =>
    budgets.filter((result) => result.transition === transition);
  const triggered = byTransition('triggered');
  const resolved = byTransition('resolved');
  const notEvaluable = byTransition('not-evaluable');
  const flagged = releases.filter((result) => result.post);
  if (
    triggered.length + resolved.length + notEvaluable.length + flagged.length ===
    0
  ) {
    return null;
  }

  const lines = ['*Swaps performance budgets*'];
  if ((triggered.length > 0 || flagged.length > 0) && mentionGroupId) {
    lines.push(`<!subteam^${mentionGroupId}>`);
  }
  const section = (title, items, render) => {
    if (items.length > 0) {
      lines.push('', title, ...items.map(render));
    }
  };
  section(
    `*Triggered* · 14-day p90 over the guardrail`,
    triggered,
    budgetLine,
  );
  section('*Resolved*', resolved, budgetLine);
  section('*Not evaluable*', notEvaluable, budgetLine);
  section(
    '*New release slower than the previous one*',
    flagged,
    releaseLine,
  );
  if (triggered.length > 0 || flagged.length > 0) {
    lines.push(
      '',
      'Triage within 2 business days: attribute, then fix or accept with an owner and a reason.',
    );
  }
  if (runUrl) {
    lines.push('', `_Run:_ <${runUrl}|GitHub Actions>`);
  }
  return lines.join('\n');
}

export function buildSummaryMarkdown({ asOfLabel, budgets, releases, errors }) {
  const lines = [
    `# Swaps performance budgets · ${asOfLabel}`,
    '',
    `14 complete ${TIME_ZONE} days, minimum n ${formatCount(MIN_SAMPLES)}${EXCLUDE_TIMEOUTS ? `, spans ≥ ${formatCount(TIMEOUT_MS)}ms excluded` : ''}.`,
    '',
    '| Rule | Window | p90 | Guardrail | n | Today | Yesterday | Posted |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const result of budgets) {
    lines.push(
      `| ${result.rule.label} | [${result.window.label}](${result.today.url}) | ${formatMs(result.today.p90)} | ${formatMs(result.rule.guardrailMs)} | ${formatCount(result.today.n)} | ${result.todayStatus} | ${result.yesterdayStatus} | ${result.transition || '—'} |`,
    );
  }
  if (releases.length > 0) {
    lines.push('', '## Per-release check', '');
    for (const result of releases) {
      if (result.skipped) {
        lines.push(`- ${result.rule.label}: skipped (${result.skipped})`);
      } else if (!result.today) {
        lines.push(
          `- ${result.rule.label}: ${result.newerVersion} has no samples before 00:00 today`,
        );
      } else if (!result.today.evaluable) {
        lines.push(
          `- ${result.rule.label}: ${result.newerVersion} (n=${formatCount(result.today.newer.n)}) vs ${result.previousVersion} (n=${formatCount(result.today.previous.n)}): not evaluable yet`,
        );
      } else {
        lines.push(
          `- ${result.rule.label}: ${result.newerVersion} ${formatMs(result.today.newer.p90)} vs ${result.previousVersion} ${formatMs(result.today.previous.p90)} (${formatPercent(result.today.gap)}, headroom ${formatPercent(result.rule.releaseHeadroom)})${result.today.flagged ? ' · flagged' : ''}${result.post ? ' · posted' : ''}`,
        );
      }
    }
  }
  if (errors.length > 0) {
    lines.push('', '## Errors', '', ...errors.map((error) => `- ${error}`));
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export async function postToSlack(webhook, text, { fetchFn = fetch } = {}) {
  const response = await fetchFn(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook HTTP ${response.status}`);
  }
}

export async function runBudgetCheck({
  today,
  rules = BUDGET_RULES,
  sentry,
}) {
  const window = windowEndingOn(today);
  const yesterdayWindow = windowEndingOn(addDays(today, -1));
  const errors = [];

  const budgets = [];
  for (const rule of rules) {
    try {
      const [todayResult, yesterdayResult] = await Promise.all([
        measure(rule, window, sentry),
        measure(rule, yesterdayWindow, sentry),
      ]);
      const todayStatus = budgetStatus(todayResult, rule.guardrailMs);
      const yesterdayStatus = budgetStatus(yesterdayResult, rule.guardrailMs);
      budgets.push({
        rule,
        window,
        today: todayResult,
        todayStatus,
        yesterdayStatus,
        transition: budgetTransition(todayStatus, yesterdayStatus),
      });
    } catch (error) {
      errors.push(`${rule.label}: ${error.message}`);
    }
  }

  const releases = [];
  const lookback = windowEndingOn(today, RELEASE_LOOKBACK_DAYS);
  for (const rule of rules.filter(({ perRelease }) => perRelease)) {
    try {
      releases.push(
        await checkRelease(
          rule,
          midnightIn(today),
          midnightIn(addDays(today, -1)),
          lookback,
          sentry,
        ),
      );
    } catch (error) {
      errors.push(`${rule.label} per-release check: ${error.message}`);
    }
  }

  return { budgets, releases, errors };
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === 'true';
  const token = env.SWAPS_SENTRY_TOKEN;
  const webhook = env.SWAPS_PERF_SLACK_WEBHOOK;
  if (!token) {
    throw new Error('SWAPS_SENTRY_TOKEN is not set');
  }
  if (!dryRun && !webhook) {
    throw new Error('SWAPS_PERF_SLACK_WEBHOOK is not set (or run with DRY_RUN=true)');
  }

  const today = env.AS_OF
    ? parseCalendarDate(env.AS_OF)
    : calendarDateIn(new Date());
  const result = await runBudgetCheck({
    today,
    sentry: {
      token,
      apiBase: env.SENTRY_API_BASE || DEFAULT_SENTRY_API_BASE,
    },
  });

  const summary = buildSummaryMarkdown({
    asOfLabel: `as of 00:00 ${shortDate(today)} ${today.year}, ${TIME_ZONE}`,
    ...result,
  });
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  const message = buildSlackMessage(result, {
    mentionGroupId: env.SWAPS_ONCALL_SLACK_GROUP_ID || '',
    runUrl: env.GITHUB_RUN_URL || '',
  });
  if (!message) {
    console.log('\nNothing changed since yesterday; no Slack post.');
  } else if (dryRun) {
    console.log(`\nDry run; would post to Slack:\n\n${message}`);
  } else {
    await postToSlack(webhook, message);
    console.log('\nPosted to Slack.');
  }

  if (result.errors.length > 0) {
    throw new Error(`${result.errors.length} Sentry queries failed`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
