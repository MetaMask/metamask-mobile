import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsSearch } from './usePerpsSearch';
import { usePerpsSorting } from './usePerpsSorting';
import type { PerpsMarketData, MarketTypeFilter } from '../controllers/types';
import type { SortField, SortDirection } from '../utils/sortMarkets';
import type { SortOptionId } from '../constants/perpsConfig';
import {
  selectPerpsWatchlistMarkets,
  selectPerpsMarketFilterPreferences,
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
  /**
   * Initial market type filter
   * @default 'all'
   */
  defaultMarketTypeFilter?: MarketTypeFilter;
  /**
   * Show markets with $0.00 volume
   * @default false
   */
  showZeroVolume?: boolean;
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
   * Market type filter state (not persisted, UI-only)
   */
  marketTypeFilterState: {
    marketTypeFilter: MarketTypeFilter;
    setMarketTypeFilter: (filter: MarketTypeFilter) => void;
  };
  /**
   * Market counts by type (for hiding empty tabs)
   */
  marketCounts: {
    crypto: number;
    equity: number;
    commodity: number;
    forex: number;
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
  defaultMarketTypeFilter = 'all',
  showZeroVolume = false,
}: UsePerpsMarketListViewParams = {}): UsePerpsMarketListViewReturn => {
  // Fetch markets data
  // Volume filtering is handled at the data layer in usePerpsMarkets
  const {
    markets: allMarkets,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarkets({
    enablePolling,
    showZeroVolume,
  });

  // Get Redux state
  const watchlistMarkets = useSelector(selectPerpsWatchlistMarkets);
  const savedSortPreference = useSelector(selectPerpsMarketFilterPreferences);

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(showWatchlistOnly);

  // Market type filter state (can be changed in UI, not persisted)
  const [marketTypeFilter, setMarketTypeFilter] = useState<MarketTypeFilter>(
    defaultMarketTypeFilter,
  );

  // Use search hook for search state and filtering
  // Pass ALL markets to search so it can search across all market types
  const searchHook = usePerpsSearch({
    markets: allMarkets,
    initialSearchVisible: defaultSearchVisible,
  });

  const { filteredMarkets: searchedMarkets, searchQuery } = searchHook;

  // Apply market type filter AFTER search
  // When searching: show all search results across all market types
  // When not searching: filter by current tab
  const marketTypeFilteredMarkets = useMemo(() => {
    // If searching, return search results from all markets (ignore tab filter)
    if (searchQuery.trim()) {
      return searchedMarkets;
    }

    // If not searching, filter by current tab
    if (marketTypeFilter === 'all') {
      // 'All' shows Crypto + Stocks + Commodities (excluding forex)
      return searchedMarkets.filter(
        (m) =>
          !m.marketType ||
          m.marketType === 'equity' ||
          m.marketType === 'commodity',
      );
    }
    if (marketTypeFilter === 'crypto') {
      // Crypto markets have no marketType set
      return searchedMarkets.filter((m) => !m.marketType);
    }
    if (marketTypeFilter === 'stocks_and_commodities') {
      // Combined stocks and commodities filter
      return searchedMarkets.filter(
        (m) => m.marketType === 'equity' || m.marketType === 'commodity',
      );
    }
    // Filter by specific market type (equity, commodity, forex)
    return searchedMarkets.filter((m) => m.marketType === marketTypeFilter);
  }, [searchedMarkets, searchQuery, marketTypeFilter]);

  // Use sorting hook for sort state and sorting logic
  const sortingHook = usePerpsSorting({
    initialOptionId: savedSortPreference,
  });

  // Wrap handleOptionChange to save preference to PerpsController
  const handleOptionChange = useCallback(
    (optionId: SortOptionId, field: SortField, direction: SortDirection) => {
      // Save preference to controller
      Engine.context.PerpsController.saveMarketFilterPreferences(optionId);
      // Update local state
      sortingHook.handleOptionChange(optionId, field, direction);
    },
    [sortingHook],
  );

  // Apply favorites filter if enabled
  const favoritesFilteredMarkets = useMemo(() => {
    if (!showFavoritesOnly) {
      return marketTypeFilteredMarkets;
    }
    return marketTypeFilteredMarkets.filter((market) =>
      watchlistMarkets.includes(market.symbol),
    );
  }, [marketTypeFilteredMarkets, showFavoritesOnly, watchlistMarkets]);

  // Apply sorting to searched and favorites-filtered markets
  const finalMarkets = sortingHook.sortMarketsList(favoritesFilteredMarkets);

  // Calculate market counts by type (for hiding empty tabs)
  const marketCounts = useMemo(() => {
    const counts = { crypto: 0, equity: 0, commodity: 0, forex: 0 };
    allMarkets.forEach((market) => {
      if (!market.marketType) {
        counts.crypto++;
      } else if (market.marketType === 'equity') {
        counts.equity++;
      } else if (market.marketType === 'commodity') {
        counts.commodity++;
      } else if (market.marketType === 'forex') {
        counts.forex++;
      }
    });
    return counts;
  }, [allMarkets]);

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
    marketTypeFilterState: {
      marketTypeFilter,
      setMarketTypeFilter,
    },
    marketCounts,
    isLoading: isLoadingMarkets,
    error,
  };
};
