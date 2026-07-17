import { resolvePredictFeedDefaultFilter } from '../../../../constants/feedConfig';
import type { PredictMarketListParams, PredictMarket } from '../../../../types';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';

/**
 * Max trending cards shown on the home section. The epic caps the home feed's
 * Trending list at 5 by default; the full `trending` feed (reached via
 * "See all") shows the complete list.
 */
export const TRENDING_DISPLAY_LIMIT = 5;

/**
 * How many markets we fetch. Deliberately larger than {@link TRENDING_DISPLAY_LIMIT}
 * so that after standalone/staleness filtering the home section still has enough
 * survivors to fill its display cap. Mirrors the feed registry's trending limit.
 */
const TRENDING_FETCH_LIMIT = 10;

/**
 * Query params derived from the feed registry so the home section and the
 * full "See all" feed share the same React Query cache key.
 * Falls back to hardcoded params if the registry entry is missing.
 */
const TRENDING_PARAMS: PredictMarketListParams =
  resolvePredictFeedDefaultFilter('trending')?.params ?? {
    order: 'volume24hr',
    status: 'open',
    limit: TRENDING_FETCH_LIMIT,
  };

export interface UsePredictTrendingSectionResult {
  /** Trending markets ready for the vertical list, capped to {@link TRENDING_DISPLAY_LIMIT}. */
  markets: PredictMarket[];
  /** Initial load with nothing to show yet (render skeletons). */
  isLoading: boolean;
  /**
   * True when load is complete and there is nothing to display (empty result
   * or fetch error). Unlike other home sections, Trending does NOT hide in
   * this state — it is the feed's fallback anchor, so the section renders an
   * "Unable to load" message instead.
   */
  showEmptyState: boolean;
}

/**
 * Data source for the Predict home "Trending" section (PRED-834).
 *
 * Pulls markets via the generic `usePredictMarketList` using params sourced
 * from `feedConfig` so the home section and the "See all" feed share the same
 * React Query cache entry.
 */
export const usePredictTrendingSection =
  (): UsePredictTrendingSectionResult => {
    const { markets, isLoading, error } = usePredictMarketList(TRENDING_PARAMS);

    const showEmptyState = !isLoading && (!!error || markets.length === 0);

    return {
      markets: markets.slice(0, TRENDING_DISPLAY_LIMIT),
      isLoading,
      showEmptyState,
    };
  };
