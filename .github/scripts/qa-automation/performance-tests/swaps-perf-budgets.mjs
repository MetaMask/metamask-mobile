#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Swaps performance budgets: daily check.
 *
 * For each rule in `swaps-perf-budgets.config.mjs`: p90 and sample count over
 * the last 14 complete Europe/Berlin days, and over the same window one day
 * earlier. A rule breaches when p90 > guardrail with at least MIN_SAMPLES
 * samples. Comparing the two windows keeps posting stateless: triggered
 * (breaching today, not yesterday), resolved (within the guardrail today,
 * breaching yesterday), not evaluable (today only). Nothing else posts; every
 * result goes to the job summary.
 *
 * Per-release check (`perRelease` rules): the newest version with samples in
 * the last RELEASE_LOOKBACK_DAYS against the version before it, over the same
 * dates (the newer version's first sampled span to 00:00 today). Flagged when
 * both have MIN_SAMPLES and the gap exceeds the rule's headroom; posted on the
 * first day it is flagged.
 *
 * Environment:
 *   SWAPS_SENTRY_TOKEN           required; read-only (org:read) Sentry token
 *   SWAPS_PERF_SLACK_WEBHOOK     required unless DRY_RUN=true
 *   DRY_RUN                      `true` logs the Slack message instead
 *   AS_OF                        optional YYYY-MM-DD; evaluate as of that day
 *   SWAPS_ONCALL_SLACK_GROUP_ID  optional; mentioned on triggers and flags
 *   SENTRY_API_BASE, GITHUB_RUN_URL, GITHUB_STEP_SUMMARY  optional
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

// --- Calendar dates in Europe/Berlin ---

function zonedParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(instant);
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

/** A calendar date as `{ year, month, day }`, month 1-12. */
export function calendarDateIn(instant, timeZone = TIME_ZONE) {
  const { year, month, day } = zonedParts(instant, timeZone);
  return { year, month, day };
}

export function addDays({ year, month, day }, days) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function parseCalendarDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
  const date = match && { year: +match[1], month: +match[2], day: +match[3] };
  if (!date || addDays(date, 0).day !== date.day) {
    throw new Error(`AS_OF must be a YYYY-MM-DD calendar date, got "${text}"`);
  }
  return date;
}

/** The UTC instant of 00:00 on `date` in `timeZone`. */
export function midnightIn(date, timeZone = TIME_ZONE) {
  const naive = Date.UTC(date.year, date.month - 1, date.day);
  const offsetAt = (instant) => {
    const local = zonedParts(instant, timeZone);
    const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    return asUtc - instant.getTime();
  };
  // A second pass settles the offset when a DST change falls within it.
  const first = new Date(naive - offsetAt(new Date(naive)));
  return new Date(naive - offsetAt(first));
}

function shortDate({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
}

/** The `days` complete days ending at 00:00 on `endDate`; `label` names the first and last. */
export function windowEndingOn(endDate, days = WINDOW_DAYS, timeZone = TIME_ZONE) {
  const startDate = addDays(endDate, -days);
  return {
    start: midnightIn(startDate, timeZone),
    end: midnightIn(endDate, timeZone),
    label: `${shortDate(startDate)} – ${shortDate(addDays(endDate, -1))}`,
  };
}

// --- Sentry ---

export function ruleQuery(rule, { excludeTimeouts = EXCLUDE_TIMEOUTS } = {}) {
  return excludeTimeouts ? `${rule.query} span.duration:<${TIMEOUT_MS}` : rule.query;
}

/** The Explore view of `query` over `start`…`end`, for Slack links. */
export function exploreUrl({ projectId, query, start, end }) {
  const params = new URLSearchParams({
    query,
    project: projectId,
    aggregateField: JSON.stringify({ yAxes: [COUNT_FIELD, P90_FIELD] }),
    mode: 'aggregate',
    start: start.toISOString().slice(0, 19),
    end: end.toISOString().slice(0, 19),
    utc: 'true',
    table: 'span',
  });
  return `https://${SENTRY_ORG}.sentry.io/explore/traces/?${params}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isoSeconds = (instant) => instant.toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * GET /api/0/organizations/{org}/events/ on the spans dataset.
 * `sampling=HIGHEST_ACCURACY` asks for a full scan; `meta.dataScanned` says
 * whether it got one.
 */
export async function querySpans(
  { projectId, query, start, end, fields, sort, perPage = 1 },
  { token, apiBase = DEFAULT_SENTRY_API_BASE, fetchFn = fetch, retryDelayMs = 2_000 },
) {
  const params = new URLSearchParams({ dataset: 'spans', project: projectId });
  fields.forEach((field) => params.append('field', field));
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
    const response = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) {
      const body = await response.json();
      return {
        rows: Array.isArray(body.data) ? body.data : [],
        fullScan: body.meta?.dataScanned !== 'partial',
      };
    }
    if (attempt >= MAX_ATTEMPTS || !RETRY_STATUSES.has(response.status)) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      throw new Error(`Sentry events API HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    await sleep(retryDelayMs * attempt);
  }
}

const numberOrNull = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

async function measure(rule, { start, end }, sentry, extraQuery = '') {
  const query = extraQuery ? `${ruleQuery(rule)} ${extraQuery}` : ruleQuery(rule);
  const { projectId } = rule;
  const { rows, fullScan } = await querySpans(
    { projectId, query, start, end, fields: [COUNT_FIELD, P90_FIELD] },
    sentry,
  );
  const row = rows[0] || {};
  return {
    p90: numberOrNull(row[P90_FIELD]),
    n: numberOrNull(row[COUNT_FIELD]) ?? 0,
    fullScan,
    url: exploreUrl({ projectId, query, start, end }),
  };
}

// --- Budget rules ---

export const STATUS = { BREACH: 'breach', OK: 'ok', NOT_EVALUABLE: 'not-evaluable' };

export function budgetStatus({ p90, n, fullScan }, guardrailMs, minSamples = MIN_SAMPLES) {
  if (!fullScan || n < minSamples || p90 === null) {
    return STATUS.NOT_EVALUABLE;
  }
  return p90 > guardrailMs ? STATUS.BREACH : STATUS.OK;
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

// --- Per-release check ---

/** `io.metamask@8.18.0+7523` → `8.18.0`; anything else → null. */
export function releaseVersion(release) {
  const match = /@(\d+\.\d+\.\d+)(?:\+[^@]*)?$/.exec(String(release || ''));
  return match ? match[1] : null;
}

function compareVersions(left, right) {
  const [a, b] = [left, right].map((version) => version.split('.').map(Number));
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
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
 * one version count together. Newest version first, each with its releases
 * and its first sampled span.
 */
export function versionsFromReleaseRows(rows) {
  const versions = new Map();
  for (const row of rows) {
    const version = releaseVersion(row.release);
    const firstSeen = toInstant(row[FIRST_SEEN_FIELD]);
    if (!version || !firstSeen) {
      continue;
    }
    const entry = versions.get(version) || { version, releases: [], firstSeen };
    entry.releases.push(row.release);
    entry.firstSeen = firstSeen < entry.firstSeen ? firstSeen : entry.firstSeen;
    versions.set(version, entry);
  }
  return [...versions.values()].sort((a, b) => compareVersions(b.version, a.version));
}

export function releaseFilter(releases) {
  return `release:[${releases.map((release) => JSON.stringify(release)).join(',')}]`;
}

/** Flagged when both have enough samples and the gap exceeds the headroom. */
export function releaseFlagged(newer, previous, headroom, minSamples = MIN_SAMPLES) {
  const enough = (side) => side.fullScan && side.n >= minSamples && side.p90 > 0;
  if (!enough(newer) || !enough(previous)) {
    return { evaluable: false, flagged: false, gap: null };
  }
  const gap = newer.p90 / previous.p90 - 1;
  return { evaluable: true, flagged: gap > headroom, gap };
}

async function checkRelease(rule, today, sentry) {
  const lookback = windowEndingOn(today, RELEASE_LOOKBACK_DAYS);
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
    const verdict = releaseFlagged(newerResult, previousResult, rule.releaseHeadroom);
    return { window, newer: newerResult, previous: previousResult, ...verdict };
  };

  const todayResult = await compareUntil(midnightIn(today));
  const yesterdayResult = await compareUntil(midnightIn(addDays(today, -1)));
  return {
    rule,
    newerVersion: newer.version,
    previousVersion: previous.version,
    today: todayResult,
    post: Boolean(todayResult?.flagged) && !yesterdayResult?.flagged,
  };
}

// --- Messages ---

const formatCount = (value) => Math.round(value).toLocaleString('en-US');
const formatMs = (value) => (value === null ? 'n/a' : `${formatCount(value)}ms`);
const formatPercent = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

function formatDateTimeIn(instant) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

function notEvaluableReason({ n, fullScan }) {
  return fullScan
    ? `n=${formatCount(n)}, below ${formatCount(MIN_SAMPLES)}`
    : 'Sentry scanned only part of the data';
}

function budgetLine({ rule, today, transition, window }) {
  const link = `<${today.url}|${window.label}>`;
  if (transition === 'not-evaluable') {
    return `• *${rule.label}*: not evaluable (${notEvaluableReason(today)}) · p90 ${formatMs(today.p90)} · ${link}`;
  }
  const comparison = transition === 'triggered' ? '>' : '≤';
  return `• *${rule.label}*: p90 ${formatMs(today.p90)} ${comparison} guardrail ${formatMs(rule.guardrailMs)} (n=${formatCount(today.n)}) · ${link}`;
}

function releaseLine({ rule, today, newerVersion, previousVersion }) {
  const { newer, previous } = today;
  return `• *${rule.label}*: ${newerVersion} p90 ${formatMs(newer.p90)} (n=${formatCount(newer.n)}) vs ${previousVersion} ${formatMs(previous.p90)} (n=${formatCount(previous.n)}), ${formatPercent(today.gap)} > ${formatPercent(rule.releaseHeadroom)} headroom · same dates from ${formatDateTimeIn(today.window.start)} ${TIME_ZONE} · <${newer.url}|${newerVersion}> <${previous.url}|${previousVersion}>`;
}

/** The Slack message for this run, or null when nothing changed. */
export function buildSlackMessage({ budgets, releases }, { mentionGroupId = '', runUrl = '' } = {}) {
  const byTransition = (transition) => budgets.filter((result) => result.transition === transition);
  const sections = [
    ['*Triggered* · 14-day p90 over the guardrail', byTransition('triggered'), budgetLine],
    ['*Resolved*', byTransition('resolved'), budgetLine],
    ['*Not evaluable*', byTransition('not-evaluable'), budgetLine],
    ['*New release slower than the previous one*', releases.filter((result) => result.post), releaseLine],
  ].filter(([, items]) => items.length > 0);
  if (sections.length === 0) {
    return null;
  }

  const needsTriage =
    byTransition('triggered').length > 0 || releases.some((result) => result.post);
  const lines = ['*Swaps performance budgets*'];
  if (needsTriage && mentionGroupId) {
    lines.push(`<!subteam^${mentionGroupId}>`);
  }
  for (const [title, items, render] of sections) {
    lines.push('', title, ...items.map(render));
  }
  if (needsTriage) {
    lines.push('', 'Triage within 2 business days: attribute, then fix or accept with an owner and a reason.');
  }
  if (runUrl) {
    lines.push('', `_Run:_ <${runUrl}|GitHub Actions>`);
  }
  return lines.join('\n');
}

function releaseSummary({ rule, skipped, today, newerVersion: newV, previousVersion: oldV, post }) {
  if (skipped) {
    return `- ${rule.label}: skipped (${skipped})`;
  }
  if (!today) {
    return `- ${rule.label}: ${newV} has no samples before 00:00 today`;
  }
  if (!today.evaluable) {
    return `- ${rule.label}: ${newV} (n=${formatCount(today.newer.n)}) vs ${oldV} (n=${formatCount(today.previous.n)}): not evaluable yet`;
  }
  return `- ${rule.label}: ${newV} ${formatMs(today.newer.p90)} vs ${oldV} ${formatMs(today.previous.p90)} (${formatPercent(today.gap)}, headroom ${formatPercent(rule.releaseHeadroom)})${today.flagged ? ' · flagged' : ''}${post ? ' · posted' : ''}`;
}

export function buildSummaryMarkdown({ asOfLabel, budgets, releases, errors }) {
  const timeouts = EXCLUDE_TIMEOUTS ? `, spans ≥ ${formatCount(TIMEOUT_MS)}ms excluded` : '';
  const lines = [
    `# Swaps performance budgets · ${asOfLabel}`,
    '',
    `${WINDOW_DAYS} complete ${TIME_ZONE} days, minimum n ${formatCount(MIN_SAMPLES)}${timeouts}.`,
    '',
    '| Rule | Window | p90 | Guardrail | n | Today | Yesterday | Posted |',
    '|---|---|---|---|---|---|---|---|',
    ...budgets.map(
      ({ rule, window, today, todayStatus, yesterdayStatus, transition }) =>
        `| ${rule.label} | [${window.label}](${today.url}) | ${formatMs(today.p90)} | ${formatMs(rule.guardrailMs)} | ${formatCount(today.n)} | ${todayStatus} | ${yesterdayStatus} | ${transition || '—'} |`,
    ),
  ];
  if (releases.length > 0) {
    lines.push('', '## Per-release check', '', ...releases.map(releaseSummary));
  }
  if (errors.length > 0) {
    lines.push('', '## Errors', '', ...errors.map((error) => `- ${error}`));
  }
  return lines.join('\n');
}

// --- Run ---

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

export async function runBudgetCheck({ today, rules = BUDGET_RULES, sentry }) {
  const window = windowEndingOn(today);
  const yesterdayWindow = windowEndingOn(addDays(today, -1));
  const budgets = [];
  const releases = [];
  const errors = [];

  for (const rule of rules) {
    try {
      const [todayResult, yesterdayResult] = await Promise.all([
        measure(rule, window, sentry),
        measure(rule, yesterdayWindow, sentry),
      ]);
      const todayStatus = budgetStatus(todayResult, rule.guardrailMs);
      const yesterdayStatus = budgetStatus(yesterdayResult, rule.guardrailMs);
      const transition = budgetTransition(todayStatus, yesterdayStatus);
      budgets.push({ rule, window, today: todayResult, todayStatus, yesterdayStatus, transition });
    } catch (error) {
      errors.push(`${rule.label}: ${error.message}`);
    }
  }

  for (const rule of rules.filter(({ perRelease }) => perRelease)) {
    try {
      releases.push(await checkRelease(rule, today, sentry));
    } catch (error) {
      errors.push(`${rule.label} per-release check: ${error.message}`);
    }
  }

  return { budgets, releases, errors };
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === 'true';
  const { SWAPS_SENTRY_TOKEN: token, SWAPS_PERF_SLACK_WEBHOOK: webhook } = env;
  if (!token) {
    throw new Error('SWAPS_SENTRY_TOKEN is not set');
  }
  if (!dryRun && !webhook) {
    throw new Error('SWAPS_PERF_SLACK_WEBHOOK is not set (or run with DRY_RUN=true)');
  }

  const today = env.AS_OF ? parseCalendarDate(env.AS_OF) : calendarDateIn(new Date());
  const result = await runBudgetCheck({
    today,
    sentry: { token, apiBase: env.SENTRY_API_BASE || DEFAULT_SENTRY_API_BASE },
  });

  const asOfLabel = `as of 00:00 ${shortDate(today)} ${today.year}, ${TIME_ZONE}`;
  const summary = buildSummaryMarkdown({ asOfLabel, ...result });
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
