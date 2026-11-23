import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// buildAxis lives inside the dashboard's inline script; pull it out so the maths can be tested without a browser.
const html = fs.readFileSync(new URL('./dashboard.html', import.meta.url), 'utf8');
const start = html.indexOf('function buildAxis(');
const end = html.indexOf('\n}\n', start) + 3;
assert.ok(start > 0 && end > start, 'buildAxis not found in dashboard.html');
// eslint-disable-next-line no-new-func
const buildAxis = new Function(`${html.slice(start, end)}\nreturn buildAxis;`)();

const MIN = 60000;

test('an ordinary capture is drawn exactly to scale', () => {
  const busy = Array.from({ length: 40 }, (_, i) => [i * 2000, i * 2000 + 500]);
  const ax = buildAxis(busy, 0, 80000);
  assert.deepEqual(ax.breaks, []);
  assert.equal(ax.x(0), 0);
  assert.equal(ax.x(40000), 50);
  assert.equal(ax.x(80000), 100);
  assert.equal(ax.inv(25), 20000);
});

test('a long idle gap collapses into one short break and the activity gets the room', () => {
  // 3 s of activity, 72 minutes of nothing, then a minute of activity
  const busy = [[0, 3000], [72 * MIN, 72 * MIN + 1000], [73 * MIN, 73 * MIN + 1000]];
  const ax = buildAxis(busy, 0, 73 * MIN + 1000);
  assert.equal(ax.breaks.length, 1);
  const [brk] = ax.breaks;
  assert.ok(brk.x1 - brk.x0 < 8, `the break stays narrow, got ${(brk.x1 - brk.x0).toFixed(1)}%`);
  assert.ok(ax.x(72 * MIN) < 15, 'the later activity starts near the left instead of 93% of the way across');
  assert.equal(ax.x(0), 0);
  assert.equal(ax.x(73 * MIN + 1000), 100);
});

test('the mapping never goes backwards and inv() round-trips inside activity', () => {
  const busy = [[0, 2000], [10 * MIN, 10 * MIN + 5000], [11 * MIN, 12 * MIN], [40 * MIN, 41 * MIN]];
  const ax = buildAxis(busy, 0, 41 * MIN);
  assert.ok(ax.breaks.length >= 1);
  let prev = -1;
  for (let t = 0; t <= 41 * MIN; t += 7000) { const x = ax.x(t); assert.ok(x >= prev, `x(${t}) went backwards`); prev = x; }
  for (const t of [1000, 10 * MIN + 2000, 11.5 * MIN, 40.5 * MIN]) assert.ok(Math.abs(ax.inv(ax.x(t)) - t) < 5, `inv(x(${t})) drifted`);
});

test('a range with a single phase zooms in and ignores activity outside it', () => {
  const busy = [[0, 1000], [20 * MIN, 20 * MIN + 1000], [20 * MIN + 12000, 20 * MIN + 13000]];
  const ax = buildAxis(busy, 20 * MIN, 20 * MIN + 14000);
  assert.deepEqual(ax.breaks, []);
  assert.equal(ax.x(20 * MIN), 0);
  assert.equal(ax.x(20 * MIN + 7000), 50);
  assert.equal(ax.x(0), 0, 'time before the range clamps to the left edge');
});
