import type { OHLCVBar } from './types';

/**
 * Maps OHLCV interval durations (ms) to TradingView resolution strings.
 */
export const INTERVAL_MS_TO_TV: Record<number, string> = {
  60000: '1',
  180000: '3',
  300000: '5',
  900000: '15',
  1800000: '30',
  3600000: '60',
  7200000: '120',
  14400000: '240',
  28800000: '480',
  43200000: '720',
  86400000: '1D',
  259200000: '3D',
  604800000: '1W',
  2592000000: '1M',
};

/**
 * Determines the TradingView resolution string from OHLCV bar timestamps.
 *
 * Uses the median of the first few time diffs to avoid gaps (e.g. weekends)
 * skewing the result, then picks the closest INTERVAL_MS_TO_TV match.
 * Falls back to '5' (5-minute) for empty or single-bar data.
 */
export function detectResolution(data: OHLCVBar[]): string {
  if (data.length < 2) return '5';

  const diffs: number[] = [];
  const len = Math.min(data.length - 1, 10);
  for (let i = 0; i < len; i++) {
    diffs.push(data[i + 1].time - data[i].time);
  }
  diffs.sort((a, b) => a - b);
  const median = diffs[Math.floor(diffs.length / 2)];

  const keys = Object.keys(INTERVAL_MS_TO_TV);
  let best = '5';
  let bestDist = Infinity;
  for (const key of keys) {
    const d = Math.abs(Number(key) - median);
    if (d < bestDist) {
      bestDist = d;
      best = INTERVAL_MS_TO_TV[Number(key)];
    }
  }
  return best;
}
