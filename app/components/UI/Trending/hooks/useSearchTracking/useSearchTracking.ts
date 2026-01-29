import { useEffect, useRef } from 'react';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';

interface UseSearchTrackingOptions {
  /**
   * The search query string
   */
  searchQuery: string;
  /**
   * Number of results found
   */
  resultsCount: number;
  /**
   * Whether results are still loading
   */
  isLoading: boolean;
  /**
   * Time filter value (e.g., '24h', '7d')
   */
  timeFilter: string;
  /**
   * Sort option value (e.g., 'price_change', 'relevance')
   */
  sortOption: string;
  /**
   * Network filter value (e.g., 'all', '0x1')
   */
  networkFilter: string;
  /**
   * Debounce delay in milliseconds (default: 500)
   */
  debounceMs?: number;
}

/**
 * Hook to track search events with debouncing.
 * Fires a search analytics event when the user searches for tokens.
 *
 * @param options - Configuration options for search tracking
 */
export const useSearchTracking = ({
  searchQuery,
  resultsCount,
  isLoading,
  timeFilter,
  sortOption,
  networkFilter,
  debounceMs = 500,
}: UseSearchTrackingOptions): void => {
  const lastTrackedSearchQuery = useRef<string>('');
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sessionManager = TrendingFeedSessionManager.getInstance();

  useEffect(() => {
    // Clear any existing debounce timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    const trimmedQuery = searchQuery?.trim() || '';

    // Only track if query is non-empty, results are loaded, and different from last tracked
    if (
      trimmedQuery &&
      !isLoading &&
      trimmedQuery !== lastTrackedSearchQuery.current
    ) {
      // Debounce search tracking to avoid tracking every keystroke
      searchDebounceTimer.current = setTimeout(() => {
        sessionManager.trackSearch({
          search_query: trimmedQuery,
          results_count: resultsCount,
          has_results: resultsCount > 0,
          time_filter: timeFilter,
          sort_option: sortOption,
          network_filter: networkFilter,
        });
        lastTrackedSearchQuery.current = trimmedQuery;
      }, debounceMs);
    }

    // Reset last tracked query when search is cleared
    if (!trimmedQuery) {
      lastTrackedSearchQuery.current = '';
    }

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [
    searchQuery,
    resultsCount,
    isLoading,
    timeFilter,
    sortOption,
    networkFilter,
    debounceMs,
    sessionManager,
  ]);
};

export default useSearchTracking;
