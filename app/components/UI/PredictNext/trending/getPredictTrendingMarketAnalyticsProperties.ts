import { getPredictionMarketProperties } from '../../Predict/trending/getPredictionMarketProperties';
import { toLegacyMarket } from './internal/legacyMarkets';
import type {
  PredictTrendingMarket,
  PredictTrendingMarketAnalyticsProperties,
} from './types';

/**
 * A market's identity for Explore search `result_clicked` events: id, slug,
 * tags and title, each only when present. Same keys and values as before
 * the move (`PredictEventProperties.MARKET_*`).
 */
export const getPredictTrendingMarketAnalyticsProperties = (
  market: PredictTrendingMarket,
): PredictTrendingMarketAnalyticsProperties =>
  getPredictionMarketProperties(toLegacyMarket(market));
