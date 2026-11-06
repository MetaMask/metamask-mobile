/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS,
  budgetStatus,
  budgetTransition,
  buildSlackMessage,
  measure,
  runBudgetCheck,
  startOfDayUtc,
  windowEndingAt,
} from './swaps-perf-budgets.mjs';
import { BUDGET_RULES } from './swaps-perf-budgets.config.mjs';

const NOV_6 = new Date('2026-11-06T00:00:00Z');
const TODAY_END = '2026-11-06T00:00:00Z';

test('windows are the 14 complete UTC days before AS_OF or today', () => {
  assert.equal(startOfDayUtc('2026-11-06').getTime(), NOV_6.getTime());
  assert.equal(startOfDayUtc('', new Date('2026-11-06T23:59:00Z')).getTime(), NOV_6.getTime());
  assert.throws(() => startOfDayUtc('2026-02-30'));
  assert.throws(() => startOfDayUtc('Nov 6'));
  const window = windowEndingAt(NOV_6);
  assert.equal(window.start.toISOString(), '2026-10-23T00:00:00.000Z');
  assert.equal(window.label, '2026-10-23 – 2026-11-05 UTC');
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
    [NOT_EVALUABLE, NOT_EVALUABLE, null],
  ];
  for (const [today, yesterday, expected] of cases) {
    assert.equal(budgetTransition(today, yesterday), expected, `${today} after ${yesterday}`);
  }
});

test('the events request uses the spans dataset and a full-accuracy scan', async () => {
  let requested;
  const fetchFn = async (url, init) => {
    requested = { url: new URL(url), init };
    const data = [{ 'count_sample()': 4176, 'p90(span.duration)': 4076.3 }];
    return { ok: true, json: async () => ({ data, meta: { dataScanned: 'partial' } }) };
  };
  const result = await measure(BUDGET_RULES[0], windowEndingAt(NOV_6), { token: 't', fetchFn });
  const params = requested.url.searchParams;
  assert.equal(requested.url.pathname, '/api/0/organizations/metamask/events/');
  assert.equal(params.get('dataset'), 'spans');
  assert.equal(params.get('project'), '2299799');
  assert.deepEqual(params.getAll('field'), ['count_sample()', 'p90(span.duration)']);
  assert.equal(params.get('start'), '2026-10-23T00:00:00Z');
  assert.equal(params.get('end'), TODAY_END);
  assert.equal(params.get('sampling'), 'HIGHEST_ACCURACY');
  assert.equal(requested.init.headers.Authorization, 'Bearer t');
  assert.deepEqual(result, { p90: 4076.3, n: 4176, fullScan: false });
});

/** A fake events API answering from `handler({ query, end })`. */
function fakeSentry(handler) {
  const fetchFn = async (url) => {
    const params = new URL(url).searchParams;
    const body = handler({ query: params.get('query'), end: params.get('end') });
    if (body instanceof Error) {
      return { ok: false, status: 400, text: async () => body.message };
    }
    return { ok: true, json: async () => ({ meta: { dataScanned: 'full' }, ...body }) };
  };
  return { token: 't', fetchFn };
}

const aggregate = (n, p90) => ({ data: [{ 'count_sample()': n, 'p90(span.duration)': p90 }] });

test('a run posts a trigger, mentions the on-call and reports failures', async () => {
  const sentry = fakeSentry(({ query, end }) => {
    if (query.includes('Bridge Balances')) {
      return new Error('bad query');
    }
    if (query.includes('Swap Quote Fetch') && query.includes('device.class')) {
      return aggregate(4176, end === TODAY_END ? 5300 : 5100);
    }
    return aggregate(1000, 100);
  });
  const { results, errors } = await runBudgetCheck({ todayEnd: NOV_6, sentry });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Bridge Balances Updated: .*bad query/);
  assert.deepEqual(
    results.filter(({ transition }) => transition).map(({ rule }) => rule.label),
    ['Mobile Swap Quote Fetch (mid-tier Android)'],
  );

  const message = buildSlackMessage(results, { mentionGroupId: 'S123', runUrl: 'https://example.com/run' });
  assert.match(message, /<!subteam\^S123>/);
  assert.match(message, /\*Triggered\*/);
  assert.match(message, /Mobile Swap Quote Fetch \(mid-tier Android\): p90 5,300ms, guardrail 5,199ms, n=4,176>/);
  assert.match(message, /<https:\/\/example\.com\/run\|GitHub Actions>/);
});

test('a quiet run posts nothing', async () => {
  const { results, errors } = await runBudgetCheck({
    todayEnd: NOV_6,
    sentry: fakeSentry(() => aggregate(1000, 100)),
  });
  assert.deepEqual(errors, []);
  assert.equal(buildSlackMessage(results, { mentionGroupId: 'S123' }), null);
});
