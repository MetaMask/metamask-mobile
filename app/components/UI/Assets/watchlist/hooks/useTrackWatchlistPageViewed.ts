import { useEffect, useRef } from 'react';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { WatchlistAnalytics } from '../constants/watchlistAnalytics';

interface UseTrackWatchlistPageViewedParams {
  tokenCount: number;
  isEmpty: boolean;
  isLoading: boolean;
  source?: string;
  activeTab?: string;
}

/**
 * Fires WATCHLIST_PAGE_VIEWED once when the fullscreen watchlist finishes its
 * initial load (tokens-only v1).
 */
const useTrackWatchlistPageViewed = ({
  tokenCount,
  isEmpty,
  isLoading,
  source = WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  activeTab = WatchlistAnalytics.ACTIVE_TAB.TOKENS,
}: UseTrackWatchlistPageViewedParams): void => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WATCHLIST_PAGE_VIEWED)
        .addProperties({
          token_count: tokenCount,
          is_empty: isEmpty,
          active_tab: activeTab,
          source,
        })
        .build(),
    );
  }, [
    activeTab,
    createEventBuilder,
    isEmpty,
    isLoading,
    source,
    tokenCount,
    trackEvent,
  ]);
};

export default useTrackWatchlistPageViewed;
