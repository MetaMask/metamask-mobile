import { getPredictionMarketProperties } from '../../Predict/trending/getPredictionMarketProperties';
import { toLegacyMarket } from './internal/legacyMarkets';
import { readNextTrendingEvent } from './internal/nextMarkets';
import type {
  PredictTrendingMarket,
  PredictTrendingMarketAnalyticsProperties,
} from './types';

/**
 * A market's identity for Explore search `result_clicked` events: id, slug,
 * tags and title, each only when present. Legacy markets keep the same keys
 * and values as before the move (`PredictEventProperties.MARKET_*`). A next
 * Venue's Event has no slug or tags, so it reports its id and title.
 */
export const getPredictTrendingMarketAnalyticsProperties = (
  market: PredictTrendingMarket,
): PredictTrendingMarketAnalyticsProperties => {
  const event = readNextTrendingEvent(market);
  if (event) {
    return { market_id: event.id, market_title: event.title };
  }
  return getPredictionMarketProperties(toLegacyMarket(market));
};
