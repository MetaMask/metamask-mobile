import { useMemo } from 'react';
import { usePredictMarketData } from './usePredictMarketData';
import { PredictMarket } from '../types';

const CAROUSEL_PAGE_SIZE = 8;

export interface UseFeaturedCarouselDataResult {
  markets: PredictMarket[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch featured carousel markets.
 *
 * Currently fetches trending markets sorted by volume (highest first).
 *
 * TODO: PRED-533 - Filter by isCarousel tag from Polymarket API response.
 * The PolymarketApiTag type already has `isCarousel?: boolean`, but the
 * parsed PredictMarket only preserves tag slugs. To properly support this:
 * 1. Preserve isCarousel flag through parsePolymarketEvents
 * 2. Filter events where tags.some(t => t.isCarousel === true)
 * 3. Fall back to trending by volume if no isCarousel markets found
 *
 * TODO: PRED-533 - Pin BTC Up or Down as Card 1 when implemented.
 * Fetch via tag_slug=up-or-down, filter series[].slug = btc-up-or-down-5m,
 * and always render as the first carousel card.
 */
export const useFeaturedCarouselData = (): UseFeaturedCarouselDataResult => {
  const { marketData, isFetching, error, refetch } = usePredictMarketData({
    category: 'trending',
    pageSize: CAROUSEL_PAGE_SIZE,
  });

  const markets = useMemo(
    () =>
      marketData.filter(
        (market) => market.status === 'open' && market.outcomes.length > 0,
      ),
    [marketData],
  );

  return {
    markets,
    isLoading: isFetching,
    error,
    refetch,
  };
};
