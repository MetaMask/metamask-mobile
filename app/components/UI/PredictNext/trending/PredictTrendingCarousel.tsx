import React, { useMemo, type ComponentProps } from 'react';
import PredictionsCarouselSection from '../../Predict/trending/PredictionsCarouselSection';
import { toLegacyMarkets } from './internal/legacyMarkets';
import { NextTrendingCarousel } from './internal/next/NextTrendingCarousel';
import { readNextTrendingEvent } from './internal/nextMarkets';
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
 * the markets of a {@link usePredictTrendingFeed} feed, and nothing when the
 * feed is empty and not loading. Legacy markets render in the legacy
 * carousel, unchanged; a next Venue's markets in the same layout with
 * PredictNext Event cards. A feed with no markets yet (loading) renders the
 * shared header and skeleton.
 */
export const PredictTrendingCarousel = ({
  feed,
  ...props
}: PredictTrendingCarouselProps) => {
  const nextEvents = useMemo(
    () =>
      feed.data.flatMap((market) => {
        const event = readNextTrendingEvent(market);
        return event ? [event] : [];
      }),
    [feed.data],
  );

  if (nextEvents.length > 0) {
    return (
      <NextTrendingCarousel
        {...props}
        isEnabled={props.isEnabled ?? true}
        events={nextEvents}
        isLoading={feed.isLoading}
      />
    );
  }
  return (
    <PredictionsCarouselSection
      {...props}
      feed={{ data: toLegacyMarkets(feed.data), isLoading: feed.isLoading }}
    />
  );
};
