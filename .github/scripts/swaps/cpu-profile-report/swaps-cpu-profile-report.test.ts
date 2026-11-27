import {
  buildFullReport,
  buildSlackMessage,
  failedTestNames,
  lastWeek,
  scenarioSample,
  summarizeScenario,
} from './swaps-cpu-profile-report.mjs';

const scenario = {
  label: 'ETH swap',
  testName: 'Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3',
};
const key = 'Swap_flow_-_ETH_to_LINK__SRP_1___SRP_2___SRP_3';

const audit = (widest: number, self: number) => ({
  swapsWidestInclusiveMs: widest,
  swapsOwnedSelfMs: self,
  swapsOwnedAreas: [{ area: 'Bridge hooks', selfMs: self }],
  nonSwapsOnPathAreas: [{ area: 'fast-equals (dependency)', selfMs: 900 }],
  nonSwapsConcurrentAreas: [{ area: 'React Native renderer', selfMs: 600 }],
  caveat: null,
});
const selector = {
  name: 'anonymous',
  url: '/app/core/redux/slices/bridge/index.ts',
  line: 993,
};
const fn = {
  name: 'anonymous',
  file: selector.url,
  line: 993,
  commit: 'abc123',
};
const report = (profile: object) => ({
  scenarios: [{ scenario: key, profiles: [profile] }],
});

describe('lastWeek', () => {
  it('is the previous Monday-to-Monday UTC week', () => {
    const { start, end, label } = lastWeek(new Date('2026-11-20T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(label).toBe('2026-11-09 – 2026-11-15 UTC');
  });
});

describe('scenarioSample', () => {
  const failed = failedTestNames({
    failedTestsStats: {
      failedTestsByTeam: {
        '@swap-bridge-dev-team': {
          tests: [
            { testName: scenario.testName },
            { testName: 'Slow', failureReason: 'quality_gates_exceeded' },
          ],
        },
      },
    },
  });

  it('keeps tests that only exceeded their quality gates', () => {
    expect([...failed]).toEqual([scenario.testName]);
  });

  it('drops failed, unsymbolicated, missing and ambiguous scenarios', () => {
    const symbolicated = { symbolicated: true, skillAudit: audit(340, 50) };
    expect(scenarioSample(report(symbolicated), failed, scenario).status).toBe(
      'failed',
    );
    expect(
      scenarioSample(report(symbolicated), new Set(), scenario).status,
    ).toBe('used');
    expect(
      scenarioSample(
        report({ ...symbolicated, symbolicated: false }),
        new Set(),
        scenario,
      ).status,
    ).toBe('unsymbolicated');
    expect(scenarioSample({ scenarios: [] }, new Set(), scenario).status).toBe(
      'missing',
    );
    expect(scenarioSample({ scenarios: [] }, failed, scenario).status).toBe(
      'failed',
    );
    const twoDevices = {
      scenarios: [
        ...report(symbolicated).scenarios,
        ...report(symbolicated).scenarios,
      ],
    };
    expect(scenarioSample(twoDevices, new Set(), scenario).status).toBe(
      'ambiguous',
    );
  });

  it('adds self time and areas across segments and keeps the widest span and its function', () => {
    const segments = {
      meta: { headSha: 'abc123' },
      scenarios: [
        {
          scenario: key,
          profiles: [
            { symbolicated: true, skillAudit: audit(300, 40) },
            {
              symbolicated: true,
              skillAudit: {
                ...audit(500, 10),
                topSwapsFrames: [{ ...selector, inclusiveMs: 500.2 }],
              },
            },
          ],
        },
      ],
    };
    const sample = scenarioSample(segments, new Set(), scenario);
    expect(sample.audit).toMatchObject({
      swapsOwnedSelfMs: 50,
      swapsWidestInclusiveMs: 500,
      widestFunction: {
        name: 'anonymous',
        file: '/app/core/redux/slices/bridge/index.ts',
        line: 993,
        commit: 'abc123',
      },
    });
    expect(summarizeScenario([sample])).toMatchObject({
      runs: [{ widestSpanMs: 500, ownedSelfMs: 50 }],
      ownedAreas: [{ area: 'Bridge hooks', avgMs: 50 }],
    });
    const partial = {
      scenarios: [
        {
          scenario: key,
          profiles: [
            { symbolicated: true, skillAudit: audit(300, 40) },
            { symbolicated: true },
          ],
        },
      ],
    };
    expect(scenarioSample(partial, new Set(), scenario).status).toBe(
      'unsymbolicated',
    );
  });
});

describe('buildSlackMessage', () => {
  const used = (widest: number, self: number, extra: object = {}) => ({
    status: 'used',
    audit: { ...audit(widest, self), ...extra },
  });
  const options = {
    window: { label: '2026-11-16 – 2026-11-22 UTC' },
    runsRead: 4,
    runsFound: 5,
    devices: ['Pixel 8 Pro'],
    runUrl: 'https://example.com/run',
  };

  it('leads with the median per scenario and says why runs were dropped', () => {
    const message = buildSlackMessage(
      [
        {
          label: 'ETH swap',
          summary: summarizeScenario([
            used(300, 40),
            used(340, 50),
            used(400, 60),
            { status: 'failed' },
          ]),
        },
        {
          label: 'Cross-chain swap',
          summary: summarizeScenario([{ status: 'missing' }]),
        },
      ],
      options,
    );
    expect(message).toBe(
      [
        ':bar_chart: *Swaps CPU profile report, 2026-11-16 – 2026-11-22 UTC*',
        "*ETH swap*: widest span median 340ms, too few runs this week to compare; p90 388ms; the analysis doesn't name the function.",
        '*Cross-chain swap*: no usable runs this week.',
        '',
        "Widest span: how long the most expensive swaps function kept the JS thread busy in one run, counting the code it called. Median and p90 are over this week's scheduled runs on main (Pixel 8 Pro). A scenario is flagged when its median is more than 20% above the median of every run in the previous three weeks.",
        'Coverage: 1 of 5 runs had no profile analysis; ETH swap: 1 of 4 runs failed before measuring; Cross-chain swap: 1 of 1 runs had no profile.',
        '<https://example.com/run|Full report>',
      ].join('\n'),
    );
  });

  it('flags a median over 20% above the pooled previous weeks and links the function to its line', () => {
    const post = (widest: number, baseline: object[], runs = 5) =>
      buildSlackMessage(
        [
          {
            label: 'Cross-chain swap',
            summary: summarizeScenario(
              Array.from({ length: runs }, () =>
                used(widest, 40, { widestFunction: fn }),
              ),
            ),
          },
        ],
        { ...options, runsRead: 5, devices: ['<@U123>'], baseline },
      );
    const weeks = [
      { 'Cross-chain swap': [700, 800, 900, 800, 800] },
      { 'Cross-chain swap': [800, 800, 800, 800, 800] },
    ];
    const message = post(1000, weeks);
    expect(message).toContain(
      ':red_circle: *Cross-chain swap*: widest span median 1,000ms, up 25% from the 800ms median of the previous 2 weeks, over the 20% limit; p90 1,000ms, from an anonymous function in <https://github.com/MetaMask/metamask-mobile/blob/abc123/app/core/redux/slices/bridge/index.ts#L993|app/core/redux/slices/bridge/index.ts:993>.\n',
    );
    expect(post(1000, weeks, 4)).toContain(
      '\n*Cross-chain swap*: widest span median 1,000ms, too few runs this week to compare; p90',
    );
    const flat = [{ 'Cross-chain swap': Array(10).fill(1000) }];
    expect(post(1204, flat)).toContain(
      '\n*Cross-chain swap*: widest span median 1,204ms, up 20% from the 1,000ms median of last week; p90',
    );
    expect(post(1206, flat)).toContain(
      ':red_circle: *Cross-chain swap*: widest span median 1,206ms, up 21% from the 1,000ms median of last week, over the 20% limit;',
    );
    expect(post(1000, weeks.slice(1))).toContain('1,000ms, no baseline yet;');
    expect(message).toContain('(&lt;@U123&gt;)');
    expect(message).not.toMatch(/Coverage|<@U123>/);
  });
});

describe('buildFullReport', () => {
  it('lists every number, links functions and runs, and escapes table text', () => {
    const run = {
      ...audit(1000, 40),
      widestFunction: fn,
      nonSwapsConcurrentAreas: [
        { area: 'Unknown (unsymbolicated)', selfMs: 600 },
        { area: 'a\\|b <x>', selfMs: 5 },
      ],
    };
    const summary = summarizeScenario([
      ...[42, 43, 44, 45, 46].map((runId) => ({
        status: 'used',
        runId,
        audit: run,
      })),
      { status: 'failed' },
    ]);
    const markdown = buildFullReport([{ label: 'Cross-chain swap', summary }], {
      window: { label: 'week' },
      runsRead: 6,
      runsFound: 7,
      devices: ['Pixel 8 Pro'],
      baseline: [{ 'Cross-chain swap': Array(10).fill(500) }],
    });
    const link =
      'an anonymous function in [app/core/redux/slices/bridge/index.ts:993](https://github.com/MetaMask/metamask-mobile/blob/abc123/app/core/redux/slices/bridge/index.ts#L993)';
    expect(markdown).toContain(
      'Coverage: 1 of 7 runs had no profile analysis; Cross-chain swap: 1 of 6 runs failed before measuring.',
    );
    expect(markdown).toContain(
      `### :red_circle: Cross-chain swap (flagged)\n\n- Widest span: median 1,000ms, up 100% from the 500ms median of last week; p90 1,000ms; at p90, ${link}.`,
    );
    expect(markdown).toContain('| fast-equals (dependency) | 900ms |');
    expect(markdown).toContain('| Native or no source path | 600ms |');
    expect(markdown).toContain('| a\\\\\\|b &lt;x&gt; | 5ms |');
    expect(markdown).toContain(
      `| [42](https://github.com/MetaMask/metamask-mobile/actions/runs/42) | 1,000ms | 40ms | ${link} |`,
    );
  });
});
