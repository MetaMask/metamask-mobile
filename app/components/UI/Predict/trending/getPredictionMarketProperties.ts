import { PredictEventProperties } from '../constants/eventNames';
import type { PredictMarket as PredictMarketType } from '../types';

/** Market identity for Explore search analytics; moved from SearchFeedRow. */
export const getPredictionMarketProperties = (market: PredictMarketType) => {
  const { id, slug, tags, title } = market;
  return {
    ...(id ? { [PredictEventProperties.MARKET_ID]: id } : {}),
    ...(slug ? { [PredictEventProperties.MARKET_SLUG]: slug } : {}),
    ...(tags ? { [PredictEventProperties.MARKET_TAGS]: tags } : {}),
    ...(title ? { [PredictEventProperties.MARKET_TITLE]: title } : {}),
  };
};
