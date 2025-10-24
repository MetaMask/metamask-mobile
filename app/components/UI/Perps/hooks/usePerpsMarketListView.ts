import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsSearch } from './usePerpsSearch';
import { usePerpsSorting } from './usePerpsSorting';
import type { PerpsMarketData } from '../controllers/types';
import type { SortField, SortDirection } from '../utils/sortMarkets';
import { PERPS_CONSTANTS, type SortOptionId } from '../constants/perpsConfig';
import {
  selectPerpsWatchlistMarkets,
  selectPerpsMarketSortPreference,
} from '../selectors/perpsController';
import Engine from '../../../../core/Engine';

interface UsePerpsMarketListViewParams {
  /**
   * Initial search visibility
   * @default false
   */
  defaultSearchVisible?: boolean;
  /**
   * Enable polling for markets data
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Show only watchlist markets initially
   * @default false
   */
  showWatchlistOnly?: boolean;
}

interface UsePerpsMarketListViewReturn {
  /**
   * Final filtered and sorted markets ready for display
   */
  markets: PerpsMarketData[];
  /**
   * Search state and controls
   */
  searchState: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
    toggleSearchVisibility: () => void;
    clearSearch: () => void;
  };
  /**
   * Sort state and controls
   */
  sortState: {
    selectedOptionId: SortOptionId;
    sortBy: SortField;
    direction: SortDirection;
    handleOptionChange: (
      optionId: SortOptionId,
      field: SortField,
      direction: SortDirection,
    ) => void;
  };
  /**
   * Favorites filter state
   */
  favoritesState: {
    showFavoritesOnly: boolean;
    setShowFavoritesOnly: (show: boolean) => void;
  };
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Error state
   */
  error: string | null;
}

/**
 * Hook for managing Perps Market List View business logic
 *
 * Responsibilities:
 * - Fetches and filters markets data
 * - Manages search state and filtering
 * - Manages sorting state and filtering
 * - Filters markets by volume validity
 * - Filters markets by watchlist (favorites)
 * - Saves sort preferences to PerpsController
 * - Exposes combined filtered markets ready for display
 *
 * This hook follows the pattern established by usePerpsHomeData,
 * extracting all business logic from the view component.
 *
 * @example
 * ```tsx
 * const {
 *   markets,
 *   searchState,
 *   sortState,
 *   favoritesState,
 *   isLoading,
 *   error,
 * } = usePerpsMarketListView({
 *   defaultSearchVisible: false,
 *   enablePolling: false,
 * });
 * ```
 */
export const usePerpsMarketListView = ({
  defaultSearchVisible = false,
  enablePolling = false,
  showWatchlistOnly = false,
}: UsePerpsMarketListViewParams = {}): UsePerpsMarketListViewReturn => {
  // Fetch markets data
  const {
    markets: allMarkets,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarkets({
    enablePolling,
  });

  // Get Redux state
  const watchlistMarkets = useSelector(selectPerpsWatchlistMarkets);
  const savedSortPreference = useSelector(selectPerpsMarketSortPreference);

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(showWatchlistOnly);

  // Filter out markets with no valid volume
  const marketsWithVolume = useMemo(
    () =>
      allMarkets.filter((market: PerpsMarketData) => {
        if (
          !market.volume ||
          market.volume === PERPS_CONSTANTS.ZERO_AMOUNT_DISPLAY ||
          market.volume === PERPS_CONSTANTS.ZERO_AMOUNT_DETAILED_DISPLAY
        ) {
          return false;
        }
        if (
          market.volume === PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY ||
          market.volume === PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY
        ) {
          return false;
        }
        return true;
      }),
    [allMarkets],
  );

  // Use search hook for search state and filtering
  const searchHook = usePerpsSearch({
    markets: marketsWithVolume,
    initialSearchVisible: defaultSearchVisible,
  });

  const { filteredMarkets: searchedMarkets } = searchHook;

  // Use sorting hook for sort state and sorting logic
  const sortingHook = usePerpsSorting({
    initialOptionId: savedSortPreference,
  });

  // Wrap handleOptionChange to save preference to PerpsController
  const handleOptionChange = useCallback(
    (optionId: SortOptionId, field: SortField, direction: SortDirection) => {
      // Save preference to controller
      Engine.context.PerpsController.saveMarketSortPreference(optionId);
      // Update local state
      sortingHook.handleOptionChange(optionId, field, direction);
    },
    [sortingHook],
  );

  // Apply favorites filter if enabled
  const favoritesFilteredMarkets = useMemo(() => {
    if (!showFavoritesOnly) {
      return searchedMarkets;
    }
    return searchedMarkets.filter((market) =>
      watchlistMarkets.includes(market.symbol),
    );
  }, [searchedMarkets, showFavoritesOnly, watchlistMarkets]);

  // Apply sorting to searched and favorites-filtered markets
  const finalMarkets = sortingHook.sortMarketsList(favoritesFilteredMarkets);

  return {
    markets: finalMarkets,
    searchState: {
      searchQuery: searchHook.searchQuery,
      setSearchQuery: searchHook.setSearchQuery,
      isSearchVisible: searchHook.isSearchVisible,
      setIsSearchVisible: searchHook.setIsSearchVisible,
      toggleSearchVisibility: searchHook.toggleSearchVisibility,
      clearSearch: searchHook.clearSearch,
    },
    sortState: {
      selectedOptionId: sortingHook.selectedOptionId,
      sortBy: sortingHook.sortBy,
      direction: sortingHook.direction,
      handleOptionChange,
    },
    favoritesState: {
      showFavoritesOnly,
      setShowFavoritesOnly,
    },
    isLoading: isLoadingMarkets,
    error,
  };
};
