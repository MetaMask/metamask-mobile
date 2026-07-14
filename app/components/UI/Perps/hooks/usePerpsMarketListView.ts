import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsSearch } from './usePerpsSearch';
import { usePerpsSorting } from './usePerpsSorting';
import {
  MARKET_SORTING_CONFIG,
  MARKET_CATEGORIES,
  sortMarkets,
  type PerpsMarketData,
  type MarketTypeFilter,
  type SortField,
  type SortDirection,
  type SortOptionId,
} from '@metamask/perps-controller';
import { isHip3Filter } from '../utils/marketCategoryMapping';
import { isRecentlyListed } from '../utils/time';
import {
  selectPerpsWatchlistMarkets,
  selectPerpsRecentlyViewedMarkets,
  selectPerpsMarketFilterPreferences,
} from '../selectors/perpsController';
import Engine from '../../../../core/Engine';
import { getSuggestedWatchlistMarkets } from '../utils/marketUtils';

interface UsePerpsMarketListViewParams {
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
   * Initial sort option ID — overrides the persisted user preference when provided.
   * @default undefined (falls back to saved user preference)
   */
  defaultSortOptionId?: SortOptionId;
  /**
   * Initial sort direction — overrides the persisted user preference when provided.
   * @default undefined (falls back to saved user preference/default override behavior)
   */
  defaultSortDirection?: SortDirection;
  /**
   * Show markets with $0.00 volume
   * @default false
   */
  showZeroVolume?: boolean;
  /**
   * Show markets with $0.00 or missing open interest
   * @default showZeroVolume
   */
  showZeroOpenInterest?: boolean;
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
    /** True when the user has at least one market on their watchlist */
    hasWatchlistMarkets: boolean;
    /** Full market data objects for each watchlisted market */
    watchlistMarketObjects: PerpsMarketData[];
    /** Top suggested markets to show when the watchlist is empty */
    suggestedMarkets: PerpsMarketData[];
  };
  /**
   * Market type filter state (not persisted, UI-only)
   */
  marketTypeFilterState: {
    marketTypeFilter: MarketTypeFilter;
    setMarketTypeFilter: (filter: MarketTypeFilter) => void;
  };
  /**
   * Recently viewed markets state
   */
  recentlyViewedState: {
    /**
     * Full market data objects for recently viewed symbols, newest-first.
     * Symbols with no matching (tradable) market are dropped.
     */
    recentlyViewedMarketObjects: PerpsMarketData[];
  };
  /**
   * Market counts by type (for hiding empty tabs/pills)
   */
  marketCounts: Record<Exclude<MarketTypeFilter, 'all'>, number>;
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
 * - Filters markets by volume and open interest validity
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
 *   enablePolling: false,
 * });
 * ```
 */
export const usePerpsMarketListView = ({
  enablePolling = false,
  showWatchlistOnly = false,
  defaultMarketTypeFilter = 'all',
  defaultSortOptionId,
  defaultSortDirection,
  showZeroVolume = false,
  showZeroOpenInterest = showZeroVolume,
}: UsePerpsMarketListViewParams = {}): UsePerpsMarketListViewReturn => {
  // Fetch markets data
  // Market activity filtering is handled at the data layer in usePerpsMarkets
  const {
    markets: allMarkets,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarkets({
    enablePolling,
    showZeroVolume,
    showZeroOpenInterest,
  });

  // Get Redux state
  const watchlistMarkets = useSelector(selectPerpsWatchlistMarkets);
  const recentlyViewedSymbols = useSelector(selectPerpsRecentlyViewedMarkets);
  const savedSortPreference = useSelector(selectPerpsMarketFilterPreferences);

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(showWatchlistOnly);

  // Market type filter state (can be changed in UI, not persisted)
  const [marketTypeFilter, setMarketTypeFilter] = useState<MarketTypeFilter>(
    defaultMarketTypeFilter,
  );

  // Sync favorites filter when route params change (useState ignores new initials
  // if the screen is already mounted, e.g. navigating from home watchlist header).
  // Watchlist and category filters are mutually exclusive: activating the watchlist
  // filter clears any active category so all watchlisted markets are visible.
  useEffect(() => {
    setShowFavoritesOnly(showWatchlistOnly);
    if (showWatchlistOnly) {
      setMarketTypeFilter('all');
    }
  }, [showWatchlistOnly]);

  // Sync filter when route params change (e.g. navigating from PerpsProducts
  // to an already-mounted market list screen — useState ignores new initials).
  useEffect(() => {
    setMarketTypeFilter(defaultMarketTypeFilter);
  }, [defaultMarketTypeFilter]);

  // Wrapped setters that enforce mutual exclusivity between watchlist and category
  // filters: turning on the watchlist clears the category, and selecting a category
  // turns off the watchlist.
  const handleSetShowFavoritesOnly = useCallback((show: boolean) => {
    setShowFavoritesOnly(show);
    if (show) {
      setMarketTypeFilter('all');
    }
  }, []);

  const handleSetMarketTypeFilter = useCallback((filter: MarketTypeFilter) => {
    setMarketTypeFilter(filter);
    if (filter !== 'all') {
      setShowFavoritesOnly(false);
    }
  }, []);

  // Use search hook for search state and filtering (search bar always visible in UI)
  const searchHook = usePerpsSearch({ markets: allMarkets });

  const { filteredMarkets: searchedMarkets } = searchHook;

  // Apply market type filter to search results (search + category work together)
  const marketTypeFilteredMarkets = useMemo(() => {
    if (marketTypeFilter === 'all') {
      return searchedMarkets;
    }

    // Special handling for 'crypto' filter - crypto markets are non-HIP3 (main DEX)
    if (marketTypeFilter === 'crypto') {
      return searchedMarkets.filter((market) => !market.isHip3);
    }

    // Special handling for 'new' filter - shows markets listed within the last
    // 30 days (same criterion as the home "Recently added" rail).
    if (marketTypeFilter === 'new') {
      return searchedMarkets.filter((market) =>
        isRecentlyListed(market.listedAt),
      );
    }

    // HIP-3 category filter: marketTypeFilter === marketType in v8+
    return searchedMarkets.filter(
      (market) => market.marketType === marketTypeFilter,
    );
  }, [searchedMarkets, marketTypeFilter]);

  // Use sorting hook for sort state and sorting logic.
  // defaultSortOptionId (from navigation params) takes precedence over the saved user
  // preference. A route-provided direction also takes precedence so Explore can
  // open the market list with the same ordering as the source section.
  // Without an explicit direction, reset changed sort options to the default
  // direction; otherwise carry the saved direction.
  const isOptionOverridden =
    defaultSortOptionId !== undefined &&
    defaultSortOptionId !== savedSortPreference.optionId;
  const sortingHook = usePerpsSorting({
    initialOptionId: (defaultSortOptionId ??
      savedSortPreference.optionId) as SortOptionId,
    initialDirection:
      defaultSortDirection ??
      (isOptionOverridden
        ? MARKET_SORTING_CONFIG.DefaultDirection
        : savedSortPreference.direction),
  });

  // Wrap handleOptionChange to save preference to PerpsController
  const handleOptionChange = useCallback(
    (optionId: SortOptionId, field: SortField, direction: SortDirection) => {
      // Save preference to controller
      Engine.context.PerpsController.saveMarketFilterPreferences(
        optionId,
        direction,
      );
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

  // Full market objects for watchlisted symbols (unaffected by search/category filters)
  const watchlistMarketObjects = useMemo(
    () => allMarkets.filter((m) => watchlistMarkets.includes(m.symbol)),
    [allMarkets, watchlistMarkets],
  );

  // Top suggested markets (excludes already-watchlisted) for the empty watchlist state
  const suggestedMarkets = useMemo(
    () => getSuggestedWatchlistMarkets(allMarkets, watchlistMarkets),
    [allMarkets, watchlistMarkets],
  );

  // Full market objects for recently viewed symbols, in newest-first order.
  // Symbols with no matching entry in allMarkets (e.g. delisted) are dropped.
  const recentlyViewedMarketObjects = useMemo(() => {
    const marketsBySymbol = new Map(allMarkets.map((m) => [m.symbol, m]));
    return recentlyViewedSymbols.reduce<PerpsMarketData[]>((acc, symbol) => {
      const market = marketsBySymbol.get(symbol);
      if (market) {
        acc.push(market);
      }
      return acc;
    }, []);
  }, [allMarkets, recentlyViewedSymbols]);

  // Apply sorting to searched and favorites-filtered markets
  // Use useMemo to ensure sorting is applied with current sortBy/direction when markets change
  const finalMarkets = useMemo(
    () =>
      sortMarkets({
        markets: favoritesFilteredMarkets,
        sortBy: sortingHook.sortBy,
        direction: sortingHook.direction,
      }),
    [favoritesFilteredMarkets, sortingHook.sortBy, sortingHook.direction],
  );

  // Calculate market counts per category (for hiding empty pills/tabs)
  const marketCounts = useMemo(() => {
    const counts = Object.fromEntries(
      [...MARKET_CATEGORIES, 'new' as const].map((category) => [category, 0]),
    ) as Record<Exclude<MarketTypeFilter, 'all'>, number>;

    allMarkets.forEach((market) => {
      if (isRecentlyListed(market.listedAt)) {
        counts.new++;
      }
      if (!market.isHip3) {
        counts.crypto++;
      } else if (market.marketType) {
        if (isHip3Filter(market.marketType) && market.marketType in counts) {
          counts[market.marketType]++;
        }
      }
    });
    return counts;
  }, [allMarkets]);

  return {
    markets: finalMarkets,
    searchState: {
      searchQuery: searchHook.searchQuery,
      setSearchQuery: searchHook.setSearchQuery,
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
      setShowFavoritesOnly: handleSetShowFavoritesOnly,
      hasWatchlistMarkets: watchlistMarkets.length > 0,
      watchlistMarketObjects,
      suggestedMarkets,
    },
    marketTypeFilterState: {
      marketTypeFilter,
      setMarketTypeFilter: handleSetMarketTypeFilter,
    },
    recentlyViewedState: {
      recentlyViewedMarketObjects,
    },
    marketCounts,
    isLoading: isLoadingMarkets,
    error,
  };
};
