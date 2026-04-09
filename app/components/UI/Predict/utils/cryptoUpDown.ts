import type { PredictMarket, PredictSeries } from '../types';

export const UP_OR_DOWN_TAG = 'up-or-down';

/**
 * Type guard: narrows to a market with a guaranteed `series` field.
 * Returns true when a market has series metadata AND the "up-or-down" tag.
 * Regular series markets (e.g., recurring tweet counts) are excluded.
 */
export function isCryptoUpDown(
  market: PredictMarket,
): market is PredictMarket & { series: PredictSeries } {
  return market.series != null && market.tags.includes(UP_OR_DOWN_TAG);
}
