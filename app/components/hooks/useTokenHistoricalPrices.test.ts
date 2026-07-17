import {
  hasInsufficientTimeCoverage,
  type TimePeriod,
  type TokenPrice,
} from './useTokenHistoricalPrices';

const HOUR_MS = 3_600_000;

function makeTimeSeries(
  startMs: number,
  count: number,
  intervalMs: number,
): TokenPrice[] {
  return Array.from({ length: count }, (_, i) => [
    String(startMs + i * intervalMs),
    100 + i,
  ]) as TokenPrice[];
}

describe('hasInsufficientTimeCoverage', () => {
  const now = 1_000_000_000_000;

  it('returns false for "all" time period (no expected duration)', () => {
    const prices = makeTimeSeries(now, 10, HOUR_MS);
    expect(hasInsufficientTimeCoverage(prices, 'all')).toBe(false);
  });

  it('returns false when data has fewer than 2 points', () => {
    const single: TokenPrice[] = [[String(now), 100]];
    expect(hasInsufficientTimeCoverage(single, '1d')).toBe(false);
    expect(hasInsufficientTimeCoverage([], '1d')).toBe(false);
  });

  it('returns false when 1d data covers 24 hours', () => {
    const prices = makeTimeSeries(now, 289, 5 * 60_000);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(false);
  });

  it('returns true when 1d data covers only 4 hours', () => {
    const fourHours = 4 * HOUR_MS;
    const prices = makeTimeSeries(now, 120, fourHours / 119);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(true);
  });

  it('returns false when 1d data covers exactly 50% of expected duration', () => {
    const halfDay = 12 * HOUR_MS;
    const prices = makeTimeSeries(now, 50, halfDay / 49);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(false);
  });

  it('returns true when 1d data covers only 15% of expected duration', () => {
    const fifteenPct = 0.15 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 50, fifteenPct / 49);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(true);
  });

  it('returns false when 1d data covers 80% of expected duration', () => {
    const eightyPct = 0.8 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 50, eightyPct / 49);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(false);
  });

  it('returns false when 1d data covers 22 hours (~91.7%)', () => {
    const twentyTwoHours = 22 * HOUR_MS;
    const prices = makeTimeSeries(now, 50, twentyTwoHours / 49);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(false);
  });

  it('returns false when 1d data covers 23 hours (~95.8%)', () => {
    const twentyThreeHours = 23 * HOUR_MS;
    const prices = makeTimeSeries(now, 50, twentyThreeHours / 49);
    expect(hasInsufficientTimeCoverage(prices, '1d')).toBe(false);
  });

  it('returns false when 1w data covers 7 days', () => {
    const sevenDays = 7 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 100, sevenDays / 99);
    expect(hasInsufficientTimeCoverage(prices, '1w')).toBe(false);
  });

  it('returns true when 1w data covers only 1 day', () => {
    const oneDay = 1 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 100, oneDay / 99);
    expect(hasInsufficientTimeCoverage(prices, '1w')).toBe(true);
  });

  it('handles 7d alias the same as 1w', () => {
    const oneDay = 1 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 100, oneDay / 99);
    expect(hasInsufficientTimeCoverage(prices, '7d')).toBe(true);
  });

  it('returns false for 1m with sufficient coverage', () => {
    const thirtyDays = 30 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 100, thirtyDays / 99);
    expect(hasInsufficientTimeCoverage(prices, '1m')).toBe(false);
  });

  it('returns true for 1m with only 5 days of data', () => {
    const fiveDays = 5 * 24 * HOUR_MS;
    const prices = makeTimeSeries(now, 100, fiveDays / 99);
    expect(hasInsufficientTimeCoverage(prices, '1m')).toBe(true);
  });

  it.each<TimePeriod>(['3m', '1y', '3y'])(
    'validates coverage for %s time period',
    (period) => {
      const prices = makeTimeSeries(now, 10, HOUR_MS);
      expect(hasInsufficientTimeCoverage(prices, period)).toBe(true);
    },
  );
});
