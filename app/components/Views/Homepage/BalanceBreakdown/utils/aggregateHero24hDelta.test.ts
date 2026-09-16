import { computeAggregateHero24hDelta } from './aggregateHero24hDelta';

describe('computeAggregateHero24hDelta', () => {
  it('returns undefined when neither tokens nor perps signals are present', () => {
    expect(
      computeAggregateHero24hDelta({
        totalFiat: 1000,
        perpsFiatContribution: 50,
        includePerpsContribution: false,
      }),
    ).toBeUndefined();
  });

  it('uses portfolio denominator when total includes non-token slices', () => {
    const totalFiat = 110_000;
    const tokenChange = 500;
    const delta = computeAggregateHero24hDelta({
      totalFiat,
      tokensDelta: {
        amount: tokenChange,
        percent: 0.01,
      },
      perpsFiatContribution: 0,
      includePerpsContribution: false,
    });
    expect(delta).toBeDefined();
    expect(delta?.amount).toBe(500);
    const prev = totalFiat - 500;
    expect(delta?.percent).toBeCloseTo(500 / prev);
  });

  it('adds perps change to token change and recomputes percent', () => {
    const totalFiat = 100_000;
    const delta = computeAggregateHero24hDelta({
      totalFiat,
      tokensDelta: { amount: 100, percent: 0.001 },
      perpsFiatContribution: 400,
      includePerpsContribution: true,
    });
    expect(delta?.amount).toBe(500);
    const prev = totalFiat - 500;
    expect(delta?.percent).toBeCloseTo(500 / prev);
  });

  it('supports perps-only when tokens have no balance change', () => {
    const totalFiat = 40_000;
    const delta = computeAggregateHero24hDelta({
      totalFiat,
      perpsFiatContribution: -200,
      includePerpsContribution: true,
    });
    expect(delta?.amount).toBe(-200);
    expect(delta?.percent).toBeCloseTo(-200 / (totalFiat + 200));
  });

  it('omits percent when previous total is non-positive', () => {
    const delta = computeAggregateHero24hDelta({
      totalFiat: 100,
      tokensDelta: { amount: 200 },
      perpsFiatContribution: 0,
      includePerpsContribution: false,
    });
    expect(delta?.amount).toBe(200);
    expect(delta?.percent).toBeUndefined();
  });
});
