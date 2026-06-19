export const TIME_PERIODS = ['1H', '1D', '1W', '1M', 'All'] as const;
export type TimePeriod = (typeof TIME_PERIODS)[number];

export const PERIOD_DURATION_MS: Record<TimePeriod, number> = {
  '1H': 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  All: 3 * 365 * 24 * 60 * 60 * 1000,
};

const normalizeTradeTimestampMs = (timestamp: number): number =>
  timestamp > 0 && timestamp < 1e12 ? timestamp * 1000 : timestamp;

/**
 * Picks the narrowest chart period that still contains the trade timestamp.
 * Used when a trade row is tapped so the chart marker is visible.
 */
export function findTimePeriodForTrade(timestamp: number): TimePeriod {
  const age = Date.now() - normalizeTradeTimestampMs(timestamp);

  if (age <= PERIOD_DURATION_MS['1H']) return '1H';
  if (age <= PERIOD_DURATION_MS['1D']) return '1D';
  if (age <= PERIOD_DURATION_MS['1W']) return '1W';
  if (age <= PERIOD_DURATION_MS['1M']) return '1M';
  return 'All';
}
