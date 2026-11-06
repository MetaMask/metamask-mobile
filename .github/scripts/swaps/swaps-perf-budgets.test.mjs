/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { STATUS, budgetStatus, buildSlackMessage } from './swaps-perf-budgets.mjs';

test('a p90 needs the minimum sample count and a full scan', () => {
  const status = (p90, n, fullScan = true) => budgetStatus({ p90, n, fullScan }, 5199);
  assert.equal(status(5300, 4176), STATUS.BREACH);
  assert.equal(status(5199, 4176), STATUS.OK);
  assert.equal(status(9000, 399), STATUS.NOT_EVALUABLE);
  assert.equal(status(9000, 4176, false), STATUS.NOT_EVALUABLE);
  assert.equal(status(null, 0), STATUS.NOT_EVALUABLE);
});

const result = (label, status, measured) => ({
  rule: { label, guardrailMs: 5199 },
  measured: { fullScan: true, ...measured },
  status,
  url: 'https://example.com/explore',
});

test('the message lists breaches and not-evaluable rules, and nothing else', () => {
  const ok = result('Within', STATUS.OK, { p90: 4000, n: 4176 });
  const breach = result('Over', STATUS.BREACH, { p90: 5300, n: 4176 });
  const low = result('Sparse', STATUS.NOT_EVALUABLE, { p90: 9000, n: 120 });
  const options = { runUrl: 'https://example.com/run' };

  assert.equal(buildSlackMessage([ok], options), null);

  const message = buildSlackMessage([ok, breach, low], options);
  assert.match(message, /\*Over the guardrail\*[^]*Over: p90 5,300ms, guardrail 5,199ms, n=4,176>/);
  assert.match(message, /\*Not evaluable\*[^]*Sparse: not evaluable \(n below 400\)/);
  assert.doesNotMatch(message, /Within/);
  assert.match(message, /<https:\/\/example\.com\/run\|GitHub Actions>/);
});
