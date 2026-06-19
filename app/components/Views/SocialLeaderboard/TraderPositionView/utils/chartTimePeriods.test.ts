import {
  findTimePeriodForTrade,
  PERIOD_DURATION_MS,
} from './chartTimePeriods';

describe('findTimePeriodForTrade', () => {
  const now = Date.now();

  it('returns 1H for trades within the last hour', () => {
    expect(
      findTimePeriodForTrade(now - PERIOD_DURATION_MS['1H'] + 60_000),
    ).toBe('1H');
  });

  it('returns 1D for trades within the last day', () => {
    expect(
      findTimePeriodForTrade(now - PERIOD_DURATION_MS['1D'] + 60_000),
    ).toBe('1D');
  });

  it('returns 1W for trades within the last week', () => {
    expect(
      findTimePeriodForTrade(now - PERIOD_DURATION_MS['1W'] + 60_000),
    ).toBe('1W');
  });

  it('returns 1M for trades within the last month', () => {
    expect(
      findTimePeriodForTrade(now - PERIOD_DURATION_MS['1M'] + 60_000),
    ).toBe('1M');
  });

  it('returns All for older trades', () => {
    expect(
      findTimePeriodForTrade(now - PERIOD_DURATION_MS.All - 60_000),
    ).toBe('All');
  });

  it('normalizes second-based timestamps', () => {
    const secondsAgo = Math.floor((now - 30 * 60 * 1000) / 1000);
    expect(findTimePeriodForTrade(secondsAgo)).toBe('1H');
  });
});
