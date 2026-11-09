/**
 * Swaps performance budgets: 14-day p90 per rule from Sentry, compared with the
 * guardrail when n >= MIN_SAMPLES and the scan wasn't downsampled.
 */

import { BUDGET_RULES, MIN_SAMPLES, SENTRY_DASHBOARDS, WINDOW_DAYS } from './swaps-performance-budgets.config.mjs';

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

const isoSeconds = (instant) => instant.toISOString().replace(/\.\d{3}Z$/, 'Z');

/** The Explore view of the rule over the window, for Slack links. */
export function exploreUrl(rule, { start, end }) {
  const params = new URLSearchParams({
    query: rule.query,
    project: rule.projectId,
    // The page's environment filter, separate from the query's `environment:production`.
    environment: 'production',
    aggregateField: JSON.stringify({ yAxes: [COUNT_FIELD, P90_FIELD] }),
    mode: 'aggregate',
    start: start.toISOString().slice(0, 19),
    end: end.toISOString().slice(0, 19),
    utc: 'true',
    table: 'span',
  });
  return `https://${SENTRY_ORG}.sentry.io/explore/traces/?${params}`;
}

/** A client's dashboard over the window, production only. */
export function dashboardUrl({ dashboardId, projectId }, { start, end }) {
  const params = new URLSearchParams({
    project: projectId,
    environment: 'production',
    start: start.toISOString().slice(0, 19),
    end: end.toISOString().slice(0, 19),
    utc: 'true',
  });
  return `https://${SENTRY_ORG}.sentry.io/dashboard/${dashboardId}/?${params}`;
}

/**
 * p90 and sample count from GET /api/0/organizations/{org}/events/ on the
 * spans dataset. `sampling=HIGHEST_ACCURACY` asks for a full scan;
 * `meta.dataScanned` says whether it got one.
 */
export async function measure(rule, window, token) {
  const params = new URLSearchParams({ dataset: 'spans', project: rule.projectId });
  params.append('field', COUNT_FIELD);
  params.append('field', P90_FIELD);
  params.set('query', rule.query);
  params.set('start', isoSeconds(window.start));
  params.set('end', isoSeconds(window.end));
  params.set('sampling', 'HIGHEST_ACCURACY');
  params.set('per_page', '1');
  const response = await fetch(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/events/?${params}`, {
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

/** One line per rule, for the console. */
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

const TITLE = 'Swaps performance budgets';
const ICON = {
  [STATUS.BREACH]: ':rotating_light:',
  [STATUS.NOT_EVALUABLE]: ':grey_question:',
  [STATUS.OK]: ':white_check_mark:',
};
const ORDER = [STATUS.BREACH, STATUS.NOT_EVALUABLE, STATUS.OK];
const runLink = (runUrl) => (runUrl ? [`<${runUrl}|Run log>`] : []);

/** Labels read "<client> <trace>" with an optional "(<scope>)" suffix. */
const splitLabel = (label) => label.match(/^(\S+) (.+?)(?: \((.+)\))?$/).slice(1);

function slackRuleLine({ rule, measured: { p90, n, fullScan }, status, url }) {
  const name = `<${url}|${splitLabel(rule.label)[1]}>`;
  const count = `n=${formatCount(n)}`;
  if (status === STATUS.NOT_EVALUABLE) {
    const reason = fullScan ? `n below ${formatCount(MIN_SAMPLES)}` : 'partial scan';
    return `${ICON[status]} ${name}: not evaluable (${reason}) · ${count}`;
  }
  const share = Math.round((p90 / rule.guardrailMs) * 100);
  const figures = `${formatMs(p90)} / ${formatMs(rule.guardrailMs)} (${share}%)`;
  return `${ICON[status]} ${name}: ${status === STATUS.BREACH ? `*${figures}*` : figures} · ${count}`;
}

/** The daily Slack message: a verdict line, then every rule grouped by client, breaches first. */
export function buildSlackMessage(results, { window, runUrl = '' } = {}) {
  const total = results.length;
  const breaches = results.filter((result) => result.status === STATUS.BREACH).length;
  const unknown = results.filter((result) => result.status === STATUS.NOT_EVALUABLE).length;
  const unknownNote = unknown ? `, ${unknown} not evaluable` : '';
  let verdict = `:white_check_mark: *${TITLE}: all ${total} rules within guardrails*`;
  if (breaches) {
    verdict = `:rotating_light: *${TITLE}: ${breaches} of ${total} over guardrail${unknownNote}*`;
  } else if (unknown) {
    verdict = `:grey_question: *${TITLE}: ${unknown} of ${total} not evaluable*`;
  }

  const lines = [verdict, `${window.label} · ${WINDOW_DAYS}-day p90 vs guardrail`];
  const groups = new Map();
  for (const result of results) {
    const [client, , scope] = splitLabel(result.rule.label);
    const dashboard = SENTRY_DASHBOARDS[client];
    const name = dashboard ? `<${dashboardUrl(dashboard, window)}|${client}>` : client;
    const header = `*${name}*${scope ? ` (${scope})` : ''}`;
    groups.set(header, [...(groups.get(header) || []), result]);
  }
  for (const [header, items] of groups) {
    const sorted = [...items].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    lines.push('', header, ...sorted.map(slackRuleLine));
  }
  if (breaches) {
    lines.push('', 'Triage within 2 business days: attribute, then fix or accept with an owner and a reason.');
  }
  if (runUrl) {
    lines.push('', ...runLink(runUrl));
  }
  return lines.join('\n');
}

export function buildFailureNotice({ runUrl = '' } = {}) {
  return [
    `:warning: *${TITLE}: check failed*`,
    "Today's results may be missing or incomplete.",
    ...runLink(runUrl),
  ].join('\n');
}

export async function runBudgetCheck({ todayEnd, token, rules = BUDGET_RULES }) {
  const window = windowEndingAt(todayEnd);
  const results = [];
  const errors = [];
  for (const rule of rules) {
    try {
      const measured = await measure(rule, window, token);
      const status = budgetStatus(measured, rule.guardrailMs);
      results.push({ rule, measured, status, url: exploreUrl(rule, window) });
    } catch (error) {
      errors.push(`${rule.label}: ${error.message}`);
    }
  }
  return { window, results, errors };
}
