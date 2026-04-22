import type { PredictMarket, PredictSeries } from '../types';

export const UP_OR_DOWN_TAG = 'up-or-down';
export const CRYPTO_TAG = 'crypto';

/**
 * Type guard: narrows to a market with a guaranteed `series` field.
 * Returns true when a market has series metadata AND both the "up-or-down"
 * and "crypto" tags. Regular series markets (e.g., recurring tweet counts)
 * and non-crypto up-or-down markets are excluded.
 */
export function isCryptoUpDown(
  market: PredictMarket,
): market is PredictMarket & { series: PredictSeries } {
  return (
    market.series != null &&
    market.tags.includes(UP_OR_DOWN_TAG) &&
    market.tags.includes(CRYPTO_TAG)
  );
}
