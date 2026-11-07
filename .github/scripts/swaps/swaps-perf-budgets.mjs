/**
 * Swaps performance budgets: daily check.
 *
 * For each rule in `swaps-perf-budgets.config.mjs`: p90 and sample count over
 * the last 14 complete UTC days. A rule breaches when p90 > guardrail with at
 * least MIN_SAMPLES samples and a full (not downsampled) scan. One Slack
 * message lists every breaching and every not-evaluable rule; nothing posts
 * when all rules are within their guardrail. Every rule's result is printed
 * to the console by `run-swaps-perf-budgets.mjs`.
 */

import {
  BUDGET_RULES,
  EXCLUDE_TIMEOUTS,
  MIN_SAMPLES,
  TIMEOUT_MS,
  WINDOW_DAYS,
} from './swaps-perf-budgets.config.mjs';

const SENTRY_ORG = 'metamask';
const P90_FIELD = 'p90(span.duration)';
const COUNT_FIELD = 'count_sample()';
const DAY_MS = 24 * 60 * 60 * 1000;

export const STATUS = { BREACH: 'breach', OK: 'ok', NOT_EVALUABLE: 'not-evaluable' };

/** 00:00 UTC today. */
export function startOfTodayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** The `WINDOW_DAYS` complete UTC days ending at `end`. */
export function windowEndingAt(end) {
  const start = new Date(end.getTime() - WINDOW_DAYS * DAY_MS);
  const last = new Date(end.getTime() - DAY_MS);
  const label = `${start.toISOString().slice(0, 10)} – ${last.toISOString().slice(0, 10)} UTC`;
  return { start, end, label };
}

const ruleQuery = (rule) =>
  EXCLUDE_TIMEOUTS ? `${rule.query} span.duration:<${TIMEOUT_MS}` : rule.query;
const isoSeconds = (instant) => instant.toISOString().replace(/\.\d{3}Z$/, 'Z');

/** The Explore view of the rule over the window, for Slack links. */
export function exploreUrl(rule, { start, end }) {
  const params = new URLSearchParams({
    query: ruleQuery(rule),
    project: rule.projectId,
    aggregateField: JSON.stringify({ yAxes: [COUNT_FIELD, P90_FIELD] }),
    mode: 'aggregate',
    start: start.toISOString().slice(0, 19),
    end: end.toISOString().slice(0, 19),
    utc: 'true',
    table: 'span',
  });
  return `https://${SENTRY_ORG}.sentry.io/explore/traces/?${params}`;
}

/**
 * p90 and sample count from GET /api/0/organizations/{org}/events/ on the
 * spans dataset. `sampling=HIGHEST_ACCURACY` asks for a full scan;
 * `meta.dataScanned` says whether it got one.
 */
export async function measure(rule, window, { token, apiBase = 'https://sentry.io', fetchFn = fetch }) {
  const params = new URLSearchParams({ dataset: 'spans', project: rule.projectId });
  params.append('field', COUNT_FIELD);
  params.append('field', P90_FIELD);
  params.set('query', ruleQuery(rule));
  params.set('start', isoSeconds(window.start));
  params.set('end', isoSeconds(window.end));
  params.set('sampling', 'HIGHEST_ACCURACY');
  params.set('per_page', '1');
  const response = await fetchFn(`${apiBase}/api/0/organizations/${SENTRY_ORG}/events/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(`Sentry events API HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const body = await response.json();
  const row = body.data?.[0] || {};
  const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  return {
    p90: number(row[P90_FIELD]),
    n: number(row[COUNT_FIELD]) ?? 0,
    fullScan: body.meta?.dataScanned !== 'partial',
  };
}

export function budgetStatus({ p90, n, fullScan }, guardrailMs) {
  if (!fullScan || n < MIN_SAMPLES || p90 === null) {
    return STATUS.NOT_EVALUABLE;
  }
  return p90 > guardrailMs ? STATUS.BREACH : STATUS.OK;
}

const formatCount = (value) => Math.round(value).toLocaleString('en-US');
const formatMs = (value) => (value === null ? 'n/a' : `${formatCount(value)}ms`);

/** One line per rule, used for both the console and Slack. */
export function resultLine({ rule, measured: { p90, n, fullScan }, status }) {
  const measured = `p90 ${formatMs(p90)}, guardrail ${formatMs(rule.guardrailMs)}, n=${formatCount(n)}`;
  if (status !== STATUS.NOT_EVALUABLE) {
    return `${rule.label}: ${measured}`;
  }
  const reason = fullScan
    ? `n below ${formatCount(MIN_SAMPLES)}`
    : 'Sentry scanned only part of the data';
  return `${rule.label}: not evaluable (${reason}); ${measured}`;
}

/** The Slack message for this run, or null when every rule is within budget. */
export function buildSlackMessage(results, { runUrl = '' } = {}) {
  const sections = [
    [STATUS.BREACH, '*Over the guardrail* · 14-day p90'],
    [STATUS.NOT_EVALUABLE, '*Not evaluable*'],
  ]
    .map(([status, title]) => [title, results.filter((result) => result.status === status)])
    .filter(([, items]) => items.length > 0);
  if (sections.length === 0) {
    return null;
  }
  const breached = results.some((result) => result.status === STATUS.BREACH);
  const lines = ['*Swaps performance budgets*'];
  for (const [title, items] of sections) {
    lines.push('', title, ...items.map((result) => `• <${result.url}|${resultLine(result)}>`));
  }
  if (breached) {
    lines.push('', 'Triage within 2 business days: attribute, then fix or accept with an owner and a reason.');
  }
  if (runUrl) {
    lines.push('', `_Run:_ <${runUrl}|GitHub Actions>`);
  }
  return lines.join('\n');
}

export async function runBudgetCheck({ todayEnd, sentry, rules = BUDGET_RULES }) {
  const window = windowEndingAt(todayEnd);
  const results = [];
  const errors = [];
  for (const rule of rules) {
    try {
      const measured = await measure(rule, window, sentry);
      const status = budgetStatus(measured, rule.guardrailMs);
      results.push({ rule, measured, status, url: exploreUrl(rule, window) });
    } catch (error) {
      errors.push(`${rule.label}: ${error.message}`);
    }
  }
  return { window, results, errors };
}
