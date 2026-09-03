// Maps OHLCV bar intervals (milliseconds) to TradingView resolution strings.
//
// Ported verbatim from chartLogic.js INTERVAL_MS_TO_TV + detectResolution
// (lines ~463-505). Phase 2 consumes this from widget/ohlcvIngestion.ts.

import type { TVResolution } from './types';

/** OHLCV bar interval in milliseconds → TradingView resolution code. */
export const INTERVAL_MS_TO_TV: Readonly<Record<number, TVResolution>> = {
  60_000: '1',
  180_000: '3',
  300_000: '5',
  900_000: '15',
  1_800_000: '30',
  3_600_000: '60',
  7_200_000: '120',
  14_400_000: '240',
  28_800_000: '480',
  43_200_000: '720',
  86_400_000: '1D',
  259_200_000: '3D',
  604_800_000: '1W',
  2_592_000_000: '1M',
};

const DEFAULT_RESOLUTION: TVResolution = '5';

/**
 * Picks the closest matching TV resolution for an OHLCV bar series.
 * Uses the median diff over the first few bars so a single gap doesn't skew
 * the result (matches legacy chartLogic.js detectResolution semantics).
 */
export function detectResolution(data: { time: number }[]): TVResolution {
  if (data.length < 2) {
    return DEFAULT_RESOLUTION;
  }
  const sampleCount = Math.min(data.length - 1, 10);
  const diffs: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    diffs.push(data[i + 1].time - data[i].time);
  }
  diffs.sort((a, b) => a - b);
  const median = diffs[Math.floor(diffs.length / 2)];

  let best = DEFAULT_RESOLUTION;
  let bestDist = Infinity;
  for (const key of Object.keys(INTERVAL_MS_TO_TV)) {
    const intervalMs = Number(key);
    const distance = Math.abs(intervalMs - median);
    if (distance < bestDist) {
      bestDist = distance;
      best = INTERVAL_MS_TO_TV[intervalMs];
    }
  }
  return best;
}
