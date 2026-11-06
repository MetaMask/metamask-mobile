/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS,
  addDays,
  budgetStatus,
  budgetTransition,
  buildSlackMessage,
  buildSummaryMarkdown,
  calendarDateIn,
  midnightIn,
  parseCalendarDate,
  querySpans,
  releaseFilter,
  releaseFlagged,
  releaseVersion,
  runBudgetCheck,
  versionsFromReleaseRows,
  windowEndingOn,
} from './swaps-perf-budgets.mjs';
import { BUDGET_RULES } from './swaps-perf-budgets.config.mjs';

const NOV_6 = { year: 2026, month: 11, day: 6 };
const TODAY_END = '2026-11-05T23:00:00Z';
const [MOBILE_QUOTE_FETCH] = BUDGET_RULES;

test('windows are complete Europe/Berlin days across DST changes', () => {
  const window = windowEndingOn(NOV_6, 14);
  assert.equal(window.start.toISOString(), '2026-10-22T22:00:00.000Z');
  assert.equal(window.end.toISOString(), '2026-11-05T23:00:00.000Z');
  assert.equal(window.label, 'Oct 23 – Nov 5');
  const march = (day) => midnightIn({ year: 2026, month: 3, day }).toISOString();
  assert.equal(march(29), '2026-03-28T23:00:00.000Z');
  assert.equal(march(30), '2026-03-29T22:00:00.000Z');
});

test('today is the Berlin calendar date, not the UTC one', () => {
  assert.deepEqual(calendarDateIn(new Date('2026-11-05T23:30:00Z')), NOV_6);
  assert.deepEqual(addDays({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 });
});

test('AS_OF must be a real calendar date', () => {
  assert.deepEqual(parseCalendarDate('2026-11-06'), NOV_6);
  assert.throws(() => parseCalendarDate('2026-02-30'));
  assert.throws(() => parseCalendarDate('Nov 6'));
});

test('a p90 needs the minimum sample count and a full scan', () => {
  const status = (p90, n, fullScan = true) => budgetStatus({ p90, n, fullScan }, 5199);
  assert.equal(status(5300, 4176), STATUS.BREACH);
  assert.equal(status(5199, 4176), STATUS.OK);
  assert.equal(status(9000, 399), STATUS.NOT_EVALUABLE);
  assert.equal(status(9000, 4176, false), STATUS.NOT_EVALUABLE);
  assert.equal(status(null, 0), STATUS.NOT_EVALUABLE);
});

test('posting compares today with yesterday', () => {
  const { BREACH, OK, NOT_EVALUABLE } = STATUS;
  const cases = [
    [BREACH, OK, 'triggered'],
    [BREACH, NOT_EVALUABLE, 'triggered'],
    [BREACH, BREACH, null],
    [OK, BREACH, 'resolved'],
    [OK, OK, null],
    [OK, NOT_EVALUABLE, null],
    [NOT_EVALUABLE, OK, 'not-evaluable'],
    [NOT_EVALUABLE, BREACH, 'not-evaluable'],
    [NOT_EVALUABLE, NOT_EVALUABLE, null],
  ];
  for (const [today, yesterday, expected] of cases) {
    assert.equal(budgetTransition(today, yesterday), expected, `${today} after ${yesterday}`);
  }
});

test('builds of one version count together, newest version first', () => {
  assert.equal(releaseVersion('io.metamask@8.18.0+7523'), '8.18.0');
  assert.equal(releaseVersion('io.metamask@8.18.0'), '8.18.0');
  assert.equal(releaseVersion('io.metamask@8.18.0-beta.1+1'), null);
  const row = (release, firstSeen) => ({ release, 'min(timestamp)': firstSeen });
  const versions = versionsFromReleaseRows([
    row('io.metamask@8.17.0+7385', 1793233722),
    row('io.metamask@8.18.0+7523', 1793697843),
    row('io.metamask@8.18.0+7530', 1793600000),
    row('io.metamask@8.9.0+6000', 1790000000),
    row('io.metamask@8.10.1+6788', '2026-10-01T00:00:00Z'),
  ]);
  assert.deepEqual(versions.map(({ version }) => version), ['8.18.0', '8.17.0', '8.10.1', '8.9.0']);
  assert.deepEqual(versions[0].releases, ['io.metamask@8.18.0+7523', 'io.metamask@8.18.0+7530']);
  assert.equal(versions[0].firstSeen.getTime(), 1793600000 * 1000);
  assert.equal(
    releaseFilter(versions[0].releases),
    'release:["io.metamask@8.18.0+7523","io.metamask@8.18.0+7530"]',
  );
});

test('a release is flagged only past the headroom with enough samples', () => {
  const sample = (p90, n = 500) => ({ p90, n, fullScan: true });
  const over = releaseFlagged(sample(1160), sample(1000), 0.15);
  assert.equal(over.flagged, true);
  assert.equal(over.gap.toFixed(2), '0.16');
  assert.equal(releaseFlagged(sample(1150), sample(1000), 0.15).flagged, false);
  assert.deepEqual(releaseFlagged(sample(2000, 399), sample(1000), 0.15), {
    evaluable: false,
    flagged: false,
    gap: null,
  });
});

test('the events request uses the spans dataset and a full-accuracy scan', async () => {
  let requested;
  const fetchFn = async (url, init) => {
    requested = { url: new URL(url), init };
    const data = [{ 'count_sample()': 4176, 'p90(span.duration)': 4076.3 }];
    return { ok: true, json: async () => ({ data, meta: { dataScanned: 'full' } }) };
  };
  const { start, end } = windowEndingOn(NOV_6, 14);
  const fields = ['count_sample()', 'p90(span.duration)'];
  const result = await querySpans(
    { projectId: '2299799', query: 'span.name:"Swap Quote Fetch"', start, end, fields },
    { token: 't', fetchFn },
  );
  const params = requested.url.searchParams;
  assert.equal(requested.url.pathname, '/api/0/organizations/metamask/events/');
  assert.equal(params.get('dataset'), 'spans');
  assert.equal(params.get('project'), '2299799');
  assert.deepEqual(params.getAll('field'), fields);
  assert.equal(params.get('start'), '2026-10-22T22:00:00Z');
  assert.equal(params.get('end'), TODAY_END);
  assert.equal(params.get('sampling'), 'HIGHEST_ACCURACY');
  assert.equal(requested.init.headers.Authorization, 'Bearer t');
  assert.equal(result.fullScan, true);
  assert.equal(result.rows[0]['count_sample()'], 4176);
});

test('the events request retries a rate limit, then fails loudly', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { ok: false, status: 429, text: async () => 'slow down' };
  };
  const { start, end } = windowEndingOn(NOV_6, 14);
  await assert.rejects(
    querySpans({ projectId: '1', query: '', start, end, fields: [] }, { token: 't', fetchFn, retryDelayMs: 0 }),
    /HTTP 429: slow down/,
  );
  assert.equal(calls, 3);
});

/** A fake events API answering from `handler({ query, end, fields })`. */
function fakeSentry(handler) {
  const fetchFn = async (url) => {
    const params = new URL(url).searchParams;
    const body = handler({ query: params.get('query'), end: params.get('end'), fields: params.getAll('field') });
    if (body instanceof Error) {
      return { ok: false, status: 400, text: async () => body.message };
    }
    return { ok: true, json: async () => ({ meta: { dataScanned: 'full' }, ...body }) };
  };
  return { token: 't', retryDelayMs: 0, fetchFn };
}

const aggregate = (n, p90) => ({ data: [{ 'count_sample()': n, 'p90(span.duration)': p90 }] });

test('a run posts a trigger and a release flag, and reports failures', async () => {
  const sentry = fakeSentry(({ query, end, fields }) => {
    const isToday = end === TODAY_END;
    if (fields.includes('release')) {
      return {
        data: [
          { release: 'io.metamask@8.18.0+7523', 'count_sample()': 900, 'min(timestamp)': 1793697843 },
          { release: 'io.metamask@8.17.0+7385', 'count_sample()': 3000, 'min(timestamp)': 1793233722 },
        ],
      };
    }
    if (query.includes('Bridge Balances')) {
      return new Error('bad query');
    }
    if (query.includes('8.18.0')) {
      return aggregate(900, isToday ? 5000 : 4000);
    }
    if (query.includes('8.17.0')) {
      return aggregate(2000, 4000);
    }
    if (query.includes('Swap Quote Fetch') && query.includes('device.class')) {
      return aggregate(4176, isToday ? 5300 : 5100);
    }
    return aggregate(1000, 100);
  });

  const result = await runBudgetCheck({ today: NOV_6, sentry });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Bridge Balances Updated: .*bad query/);
  const quoteFetch = result.budgets.find(({ rule }) => rule === MOBILE_QUOTE_FETCH);
  assert.equal(quoteFetch.transition, 'triggered');
  assert.equal(result.budgets.filter(({ transition }) => transition).length, 1);

  const release = result.releases.find(({ rule }) => rule === MOBILE_QUOTE_FETCH);
  assert.equal(release.newerVersion, '8.18.0');
  assert.equal(release.previousVersion, '8.17.0');
  assert.equal(release.today.flagged, true);
  assert.equal(release.post, true);

  const message = buildSlackMessage(result, { mentionGroupId: 'S123', runUrl: 'https://example.com/run' });
  assert.match(message, /<!subteam\^S123>/);
  assert.match(message, /Mobile Swap Quote Fetch \(mid-tier Android\)\*: p90 5,300ms > guardrail 5,199ms \(n=4,176\)/);
  assert.match(message, /8\.18\.0 p90 5,000ms .* vs 8\.17\.0 4,000ms .* \+25\.0% > \+15\.0% headroom/);
  assert.match(message, /<https:\/\/example\.com\/run\|GitHub Actions>/);

  const summary = buildSummaryMarkdown({ asOfLabel: 'Nov 6', ...result });
  assert.match(summary, /\| Mobile Swap Quote Fetch \(mid-tier Android\) \| \[Oct 23 – Nov 5\]/);
  assert.match(summary, /## Errors/);
});

test('a quiet run posts nothing and never mentions the on-call', async () => {
  const sentry = fakeSentry(({ fields }) => (fields.includes('release') ? { data: [] } : aggregate(1000, 100)));
  const result = await runBudgetCheck({ today: NOV_6, sentry });
  assert.deepEqual(result.errors, []);
  assert.equal(buildSlackMessage(result, { mentionGroupId: 'S123' }), null);
  assert.ok(result.releases.every(({ skipped }) => skipped));
});
