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
import {
  isHip3Filter,
  filterMarketsByCategory,
} from '../utils/marketCategoryMapping';
import { isRecentlyListed } from '../utils/time';
import { useNowOnScreenFocus } from './useNowOnScreenFocus';
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

  // `usePerpsMarkets` is a cached REST snapshot with no continuous updates, so
  // the 'new' filter and count below use `now` from useNowOnScreenFocus
  // (refreshed when this screen regains focus) rather than reading Date.now()
  // directly in the memos — otherwise a mounted screen could keep showing a
  // stale "new" result past the 30-day boundary.
  const now = useNowOnScreenFocus();

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
  // `filterMarketsByCategory`'s own 'new' bucket is the controller's concept
  // of uncategorised HIP-3 markets; mobile's "New" means markets listed
  // within the last 30 days instead (same criterion as the home "Recently
  // added" rail and the "New" pill/badge gated by useHasNewMarkets — see
  // `relatedMarkets.ts` for the same distinction). `listedAt` is only
  // populated when the Terminal backend flag is on (see useHasNewMarkets); a
  // caller that reaches this filter directly (e.g. a deep link or restored
  // navigation state) while that flag is off will simply see an empty list
  // rather than an error, since every market's `listedAt` will be undefined.
  const marketTypeFilteredMarkets = useMemo(() => {
    if (marketTypeFilter === 'new') {
      return searchedMarkets.filter((market) =>
        isRecentlyListed(market.listedAt, now),
      );
    }
    return filterMarketsByCategory(searchedMarkets, marketTypeFilter);
  }, [searchedMarkets, marketTypeFilter, now]);

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

  // Full market objects for recently viewed symbols, in newest-first order,
  // filtered by the active category so the rail only shows markets relevant
  // to the current product filter. Symbols with no matching entry in
  // allMarkets (e.g. delisted) are dropped.
  //
  // 'new' is special-cased the same way as `marketTypeFilteredMarkets` above,
  // so the rail agrees with the main list on what "New" means.
  const recentlyViewedMarketObjects = useMemo(() => {
    const marketsBySymbol = new Map(allMarkets.map((m) => [m.symbol, m]));
    const orderedMarkets = recentlyViewedSymbols.reduce<PerpsMarketData[]>(
      (acc, symbol) => {
        const market = marketsBySymbol.get(symbol);
        if (market) {
          acc.push(market);
        }
        return acc;
      },
      [],
    );
    if (marketTypeFilter === 'new') {
      return orderedMarkets.filter((market) =>
        isRecentlyListed(market.listedAt, now),
      );
    }
    return filterMarketsByCategory(orderedMarkets, marketTypeFilter);
  }, [allMarkets, recentlyViewedSymbols, marketTypeFilter, now]);

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
      if (isRecentlyListed(market.listedAt, now)) {
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
  }, [allMarkets, now]);

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
