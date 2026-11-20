import {
  buildSlackMessage,
  failedTestNames,
  lastWeek,
  percentile,
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

describe('percentile', () => {
  it('interpolates between ranks', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.9)).toBe(91);
  });
});

describe('scenarioSample', () => {
  const failed = failedTestNames({
    failedTestsStats: {
      failedTestsByTeam: {
        '@swap-bridge-dev-team': { tests: [{ testName: scenario.testName }] },
      },
    },
  });

  it('drops failed tests, unsymbolicated profiles and missing scenarios', () => {
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
  });
});

describe('buildSlackMessage', () => {
  it('lists median and p90 per scenario, and says when no run was usable', () => {
    const used = [audit(300, 40), audit(340, 50), audit(400, 60)].map(
      (item) => ({
        status: 'used',
        audit: item,
      }),
    );
    const message = buildSlackMessage(
      [
        {
          label: 'ETH swap',
          summary: summarizeScenario([...used, { status: 'failed' }]),
        },
        {
          label: 'Cross-chain swap',
          summary: summarizeScenario([{ status: 'missing' }]),
        },
      ],
      {
        window: { label: '2026-11-09 – 2026-11-15 UTC' },
        runsRead: 4,
        runsFound: 4,
        runUrl: 'https://example.com/run',
      },
    );
    expect(message).toBe(
      [
        ':bar_chart: *Swaps CPU profile report, 2026-11-09 – 2026-11-15 UTC*',
        'Shadow mode: numbers only, no flags. Read 4 of 4 scheduled performance runs on main (Pixel 8 Pro). Areas show average self time per run.',
        '',
        '*ETH swap*: 3 runs used (1 failed, 0 unsymbolicated, 0 missing)',
        'Widest swaps-owned span: median 340ms · p90 388ms',
        'Swaps-owned self time: median 50ms · p90 58ms',
        'Top swaps areas: Bridge hooks 50ms',
        'Called by swaps: fast-equals (dependency) 900ms',
        'Co-running, not Swaps: React Native renderer 600ms',
        '',
        '*Cross-chain swap*: 0 runs used (0 failed, 0 unsymbolicated, 1 missing)',
        'No passing, symbolicated runs this week.',
        '',
        '<https://example.com/run|Run log>',
      ].join('\n'),
    );
  });
});
