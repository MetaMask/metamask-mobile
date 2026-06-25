import { useMemo } from 'react';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import type { PredictMarket } from '../../../../types';

/**
 * Over-fetch trending markets so the home section has headroom above its
 * display cap. Matches the ticket's suggested v1 params (`limit: 20`).
 */
export const TRENDING_FETCH_LIMIT = 20;

/**
 * Max trending cards shown on the home section. The epic caps the home feed's
 * Trending list at 5 by default; the full `trending` feed (reached via
 * "See all") shows the complete list.
 */
export const TRENDING_DISPLAY_LIMIT = 5;

export interface UsePredictTrendingSectionResult {
  /** Trending markets ready for the vertical list (already display-capped). */
  markets: PredictMarket[];
  /** Initial load with nothing to show yet (render skeletons). */
  isLoading: boolean;
  /**
   * No data after load. Unlike the other home sections, Trending does NOT hide
   * here — it is the feed's fallback anchor, so the section shows an "Unable to
   * load" message instead. `usePredictMarketList` swallows provider errors
   * (returns `[]`), so the empty and error cases collapse into this one flag.
   */
  isUnavailable: boolean;
}

/**
 * Data source for the Predict home "Trending" section (PRED-834).
 *
 * Pulls markets via the generic `usePredictMarketList` ordered by 24h volume
 * (`order: 'volume24hr'`, `status: 'open'`) and caps the result to
 * {@link TRENDING_DISPLAY_LIMIT} client-side. Section-specific curation lives
 * here rather than in the generic hook (consistent with the other home
 * sections).
 */
export const usePredictTrendingSection =
  (): UsePredictTrendingSectionResult => {
    const { markets, isLoading } = usePredictMarketList({
      order: 'volume24hr',
      status: 'open',
      limit: TRENDING_FETCH_LIMIT,
    });

    const displayedMarkets = useMemo(
      () => markets.slice(0, TRENDING_DISPLAY_LIMIT),
      [markets],
    );

    const isUnavailable = !isLoading && displayedMarkets.length === 0;

    return { markets: displayedMarkets, isLoading, isUnavailable };
  };
