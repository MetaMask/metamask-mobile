import React from 'react';
import { PredictionSearchRowItem } from '../../Predict/trending/PredictionRowItem';
import { toLegacyMarket } from './internal/legacyMarkets';
import type { PredictTrendingMarket } from './types';

export interface PredictTrendingSearchRowProps {
  market: PredictTrendingMarket;
}

/**
 * A market row in Explore search results, attributed to the
 * `explore_search` entry point. Renders the legacy row unchanged.
 */
export const PredictTrendingSearchRow = ({
  market,
}: PredictTrendingSearchRowProps) => (
  <PredictionSearchRowItem market={toLegacyMarket(market)} />
);
