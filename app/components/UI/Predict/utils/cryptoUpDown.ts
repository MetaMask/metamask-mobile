import type { PredictMarket } from '../types';

export const UP_OR_DOWN_TAG = 'up-or-down';

/**
 * Returns true when a market has series metadata AND the "up-or-down" tag.
 * Regular series markets (e.g., recurring tweet counts) are excluded.
 */
export function isCryptoUpDown(market: PredictMarket): boolean {
  return market.series != null && market.tags.includes(UP_OR_DOWN_TAG);
}
