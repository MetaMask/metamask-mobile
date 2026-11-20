import {
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

  it('adds self time and areas across segments and keeps the widest span', () => {
    const segments = {
      scenarios: [
        {
          scenario: key,
          profiles: [
            { symbolicated: true, skillAudit: audit(300, 40) },
            { symbolicated: true, skillAudit: audit(500, 10) },
          ],
        },
      ],
    };
    const sample = scenarioSample(segments, new Set(), scenario);
    expect(sample.audit).toMatchObject({
      swapsOwnedSelfMs: 50,
      swapsWidestInclusiveMs: 500,
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
          summary: summarizeScenario([
            ...used,
            { status: 'failed' },
            { status: 'ambiguous' },
          ]),
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
        devices: ['Pixel 8 Pro', 'Pixel 9'],
        runUrl: 'https://example.com/run',
      },
    );
    expect(message).toContain('on main (Pixel 8 Pro, Pixel 9)');
    expect(message).toContain(
      '*ETH swap*: 3 used (1 failed, 0 unsymbolicated, 0 missing)\n1 skipped: ambiguous device match',
    );
    expect(message).toContain('median 340ms · p90 388ms');
    expect(message).toContain('median 50ms · p90 58ms');
    expect(message).toContain(
      '*Cross-chain swap*: 0 used (0 failed, 0 unsymbolicated, 1 missing)',
    );
    expect(message).toContain('No passing, symbolicated runs this week.');
  });

  it('escapes Slack markup in artifact-derived names', () => {
    const sample = {
      status: 'used',
      audit: {
        ...audit(300, 40),
        swapsOwnedAreas: [{ area: '<!channel> & co', selfMs: 40 }],
      },
    };
    const message = buildSlackMessage(
      [{ label: 'ETH swap', summary: summarizeScenario([sample]) }],
      {
        window: { label: 'week' },
        runsRead: 1,
        runsFound: 1,
        devices: ['<@U123>'],
      },
    );
    expect(message).toContain('&lt;!channel&gt; &amp; co 40ms');
    expect(message).toContain('(&lt;@U123&gt;)');
    expect(message).not.toMatch(/<!channel>|<@U123>/);
  });
});
