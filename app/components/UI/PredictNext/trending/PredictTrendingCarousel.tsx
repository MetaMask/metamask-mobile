import React, { type ComponentProps } from 'react';
import PredictionsCarouselSection from '../../Predict/trending/PredictionsCarouselSection';
import { toLegacyMarkets } from './internal/legacyMarkets';
import type { PredictTrendingMarket } from './types';

export type PredictTrendingCarouselProps = Omit<
  ComponentProps<typeof PredictionsCarouselSection>,
  'feed'
> & {
  feed: { data: PredictTrendingMarket[]; isLoading: boolean };
};

/**
 * An Explore tab's Predictions carousel: section header with View all, up to
 * six market cards, and Explore analytics on card and buy taps. It renders
 * the markets of a {@link usePredictTrendingFeed} feed with the legacy
 * carousel, unchanged, and nothing when the feed is empty and not loading.
 */
export const PredictTrendingCarousel = ({
  feed,
  ...props
}: PredictTrendingCarouselProps) => (
  <PredictionsCarouselSection
    {...props}
    feed={{ data: toLegacyMarkets(feed.data), isLoading: feed.isLoading }}
  />
);
