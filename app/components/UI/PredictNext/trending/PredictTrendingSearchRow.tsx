import React from 'react';
import { PredictionSearchRowItem } from '../../Predict/trending/PredictionRowItem';
import { toLegacyMarket } from './internal/legacyMarkets';
import { NextTrendingSearchRow } from './internal/next/NextTrendingSearchRow';
import { readNextTrendingEvent } from './internal/nextMarkets';
import type { PredictTrendingMarket } from './types';

export interface PredictTrendingSearchRowProps {
  market: PredictTrendingMarket;
}

/**
 * A market row in Explore search results, attributed to the
 * `explore_search` entry point. A legacy market renders the legacy row
 * unchanged; a next Venue's market renders the same layout and opens its
 * Event through an intent.
 */
export const PredictTrendingSearchRow = ({
  market,
}: PredictTrendingSearchRowProps) => {
  const event = readNextTrendingEvent(market);
  return event ? (
    <NextTrendingSearchRow event={event} />
  ) : (
    <PredictionSearchRowItem market={toLegacyMarket(market)} />
  );
};
