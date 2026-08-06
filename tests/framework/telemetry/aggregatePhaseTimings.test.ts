import {
  aggregateTimingSuites,
  average,
  formatTrendMarkdown,
  parseArgs,
  percentile,
} from './aggregatePhaseTimings.ts';

describe('aggregatePhaseTimings', () => {
  it('returns null average for empty input', () => {
    expect(average([])).toBeNull();
  });

  it('returns arithmetic mean', () => {
    expect(average([10, 20, 30])).toBe(20);
  });

  it('returns null percentile for empty input', () => {
    expect(percentile([], 95)).toBeNull();
  });

  it('returns p95 from sorted values', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    expect(percentile(values, 95)).toBe(100);
    expect(percentile(values, 50)).toBe(50);
  });

  it('computes phase stats, slowest shard, and retry attempts', () => {
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
          {
            title: 'timed-out-once',
            file: 'a.spec.ts',
            retry: 0,
            outcome: 'timedOut',
            phases: { login: 10 },
            meta: { platform: 'android' },
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

    expect(report.testCount).toBe(4);
    expect(report.suiteCount).toBe(2);
    expect(report.phases.android.login.avg).toBe(260 / 3);
    expect(report.phases.android.login.samples).toBe(3);
    expect(report.slowestShard?.suite).toBe('suite-a');
    expect(report.sessionReuse.rate).toBe(2 / 3);
    expect(report.retryRatePerSpec['a.spec.ts::t2'].retries).toBe(1);
    // timedOut with retry === 0 is not counted as a retry attempt
    expect(report.retryRatePerSpec['a.spec.ts::timed-out-once'].retries).toBe(
      0,
    );
  });

  it('formats trend markdown with phase table headers', () => {
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

    expect(md).toMatch(/# Appium phase timing trend/);
    expect(md).toMatch(/\| Phase \| Avg \| p95 \| Samples \|/);
    expect(md).toMatch(/login/);
  });

  it('reads CLI flags', () => {
    const opts = parseArgs(
      ['--input', '/tmp/timings', '--markdown', '/tmp/out.md'],
      '/default',
    );

    expect(opts.input).toMatch(/timings$/);
    expect(opts.markdown).toMatch(/out\.md$/);
  });
});
