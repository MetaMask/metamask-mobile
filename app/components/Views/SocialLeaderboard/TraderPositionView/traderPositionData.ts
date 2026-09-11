import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';

export const TIME_PERIODS = ['1H', '1D', '1W', '1M', 'All'] as const;
export type TimePeriod = (typeof TIME_PERIODS)[number];

export const PERIOD_TO_API: Record<TimePeriod, string> = {
  '1H': '1d',
  '1D': '1d',
  '1W': '7d',
  '1M': '1m',
  All: '3y',
};

export const PERIOD_DURATION_MS: Record<TimePeriod, number> = {
  '1H': 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  All: 3 * 365 * 24 * 60 * 60 * 1000,
};

/**
 * Derives percentage change from historical price data points.
 * For "1H" we find the point closest to one hour ago within the data set.
 * @param nowMs - Same clock as used to slice 1H prices (avoids mismatched "now").
 */
export function derivePercentChange(
  prices: TokenPrice[],
  period: TimePeriod,
  nowMs: number,
): number | undefined {
  if (!prices.length) return undefined;

  const endPrice = prices.at(-1)?.[1];
  if (endPrice == null) return undefined;

  let startPrice: number;

  if (period === '1H') {
    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const closest = prices.reduce(
      (best, pt) =>
        Math.abs(Number(pt[0]) - oneHourAgo) <
        Math.abs(Number(best[0]) - oneHourAgo)
          ? pt
          : best,
      prices[0],
    );
    startPrice = closest[1];
  } else {
    startPrice = prices[0][1];
  }

  if (startPrice === 0) return undefined;
  return ((endPrice - startPrice) / startPrice) * 100;
}
