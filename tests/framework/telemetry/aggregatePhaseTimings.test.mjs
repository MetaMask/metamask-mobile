import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateTimingSuites,
  average,
  formatTrendMarkdown,
  parseArgs,
  percentile,
} from '../../../.github/scripts/aggregate-appium-timings.mjs';

test('average returns null for empty input', () => {
  assert.equal(average([]), null);
});

test('average returns arithmetic mean', () => {
  assert.equal(average([10, 20, 30]), 20);
});

test('percentile returns null for empty input', () => {
  assert.equal(percentile([], 95), null);
});

test('percentile returns p95 from sorted values', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(values, 95), 100);
  assert.equal(percentile(values, 50), 50);
});

test('aggregateTimingSuites computes phase stats and slowest shard', () => {
  const report = aggregateTimingSuites([
    {
      suite: 'suite-a',
      sourcePath: '/tmp/a.json',
      tests: [
        {
          title: 't1',
          file: 'a.spec.ts',
          retry: 0,
          outcome: 'passed',
          phases: { login: 100, test_body: 200 },
          meta: { platform: 'android', sessionReused: true },
        },
        {
          title: 't2',
          file: 'a.spec.ts',
          retry: 1,
          outcome: 'passed',
          phases: { login: 150, test_body: 250 },
          meta: { platform: 'android', sessionReused: false },
        },
      ],
    },
    {
      suite: 'suite-b',
      sourcePath: '/tmp/b.json',
      tests: [
        {
          title: 't3',
          file: 'b.spec.ts',
          retry: 0,
          outcome: 'passed',
          phases: { login: 50, test_body: 50 },
          meta: { platform: 'ios', sessionReused: true },
        },
      ],
    },
  ]);

  assert.equal(report.testCount, 3);
  assert.equal(report.suiteCount, 2);
  assert.equal(report.phases.android.login.avg, 125);
  assert.equal(report.phases.android.login.samples, 2);
  assert.equal(report.slowestShard?.suite, 'suite-a');
  assert.equal(report.sessionReuse.rate, 2 / 3);
  assert.ok(
    report.retryRatePerSpec['a.spec.ts::t2'].retries >= 1,
  );
});

test('formatTrendMarkdown includes phase table headers', () => {
  const report = aggregateTimingSuites([
    {
      suite: 's',
      tests: [
        {
          title: 't',
          file: 'f.ts',
          phases: { login: 10 },
          meta: { platform: 'android' },
        },
      ],
    },
  ]);
  const md = formatTrendMarkdown(report);
  assert.match(md, /# Appium phase timing trend/);
  assert.match(md, /\| Phase \| Avg \| p95 \| Samples \|/);
  assert.match(md, /login/);
});

test('parseArgs reads flags', () => {
  const opts = parseArgs([
    '--input',
    '/tmp/timings',
    '--markdown',
    '/tmp/out.md',
  ]);
  assert.match(opts.input, /timings$/);
  assert.match(opts.markdown ?? '', /out\.md$/);
});
