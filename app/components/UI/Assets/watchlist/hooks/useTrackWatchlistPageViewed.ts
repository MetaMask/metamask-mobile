import { useEffect, useRef } from 'react';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { WatchlistAnalytics } from '../constants/watchlistAnalytics';

interface UseTrackWatchlistPageViewedParams {
  tokenCount: number;
  perpsCount?: number;
  isEmpty: boolean;
  isLoading: boolean;
  source?: string;
  activeTab?: string;
  isUnified?: boolean;
}

/**
 * Fires the appropriate watchlist page-view event once after the fullscreen
 * watchlist finishes its initial load.
 */
const useTrackWatchlistPageViewed = ({
  tokenCount,
  perpsCount = 0,
  isEmpty,
  isLoading,
  source = WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  activeTab = WatchlistAnalytics.ACTIVE_TAB.TOKENS,
  isUnified = false,
}: UseTrackWatchlistPageViewedParams): void => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    const eventName = isUnified
      ? MetaMetricsEvents.UNIFIED_WATCHLIST_PAGE_VIEWED
      : MetaMetricsEvents.WATCHLIST_PAGE_VIEWED;
    const trackedIsEmpty = isUnified ? tokenCount + perpsCount === 0 : isEmpty;
    const properties = isUnified
      ? {
          token_count: tokenCount,
          perps_count: perpsCount,
          is_empty: trackedIsEmpty,
          active_filter: activeTab,
          source,
        }
      : {
          token_count: tokenCount,
          is_empty: trackedIsEmpty,
          active_tab: activeTab,
          source,
        };

    trackEvent(createEventBuilder(eventName).addProperties(properties).build());
  }, [
    activeTab,
    createEventBuilder,
    isEmpty,
    isLoading,
    isUnified,
    perpsCount,
    source,
    tokenCount,
    trackEvent,
  ]);
};

export default useTrackWatchlistPageViewed;
