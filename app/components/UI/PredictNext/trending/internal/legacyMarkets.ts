import type { PredictMarket } from '../../../Predict/types';
import type { PredictTrendingMarket } from '../types';

/**
 * The legacy branch's markets behind the opaque public type. The objects are
 * passed through untouched; only their static type changes.
 */
export const toTrendingMarkets = (
  markets: PredictMarket[],
): PredictTrendingMarket[] => markets as unknown as PredictTrendingMarket[];

/** One legacy market behind the opaque public type. */
export const toTrendingMarket = (
  market: PredictMarket,
): PredictTrendingMarket => market as unknown as PredictTrendingMarket;

/** A market minted by {@link toTrendingMarkets}, back to its legacy type. */
export const toLegacyMarket = (market: PredictTrendingMarket): PredictMarket =>
  market as unknown as PredictMarket;

/** Markets minted by {@link toTrendingMarkets}, back to their legacy type. */
export const toLegacyMarkets = (
  markets: PredictTrendingMarket[],
): PredictMarket[] => markets as unknown as PredictMarket[];
