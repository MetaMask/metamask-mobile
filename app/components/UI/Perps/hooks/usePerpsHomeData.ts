import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsLiveFills,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import type {
  Position,
  Order,
  OrderFill,
  PerpsMarketData,
} from '../controllers/types';
import {
  HOME_SCREEN_CONFIG,
  MARKET_SORTING_CONFIG,
} from '../constants/perpsConfig';
import { sortMarkets, type SortField } from '../utils/sortMarkets';
import {
  selectPerpsWatchlistMarkets,
  selectPerpsMarketFilterPreferences,
} from '../selectors/perpsController';

interface UsePerpsHomeDataParams {
  positionsLimit?: number;
  ordersLimit?: number;
  trendingLimit?: number;
  activityLimit?: number;
  searchQuery?: string;
}

interface UsePerpsHomeDataReturn {
  positions: Position[];
  orders: Order[];
  watchlistMarkets: PerpsMarketData[];
  perpsMarkets: PerpsMarketData[]; // Crypto markets (renamed from trending)
  stocksMarkets: PerpsMarketData[]; // Equity markets
  commoditiesMarkets: PerpsMarketData[]; // Commodity markets
  stocksAndCommoditiesMarkets: PerpsMarketData[]; // Combined stocks & commodities markets
  forexMarkets: PerpsMarketData[]; // Forex markets
  recentActivity: OrderFill[];
  sortBy: SortField;
  isLoading: {
    positions: boolean;
    orders: boolean;
    markets: boolean;
    activity: boolean;
  };
  refresh: () => Promise<void>;
}

/**
 * Combined hook for Perps home screen data using WebSocket live hooks
 * Real-time updates for positions, orders, and fills via WebSocket
 * Uses object parameters pattern for maintainability
 */
export const usePerpsHomeData = ({
  positionsLimit = HOME_SCREEN_CONFIG.POSITIONS_CAROUSEL_LIMIT,
  ordersLimit = HOME_SCREEN_CONFIG.ORDERS_CAROUSEL_LIMIT,
  trendingLimit = HOME_SCREEN_CONFIG.TRENDING_MARKETS_LIMIT,
  activityLimit = HOME_SCREEN_CONFIG.RECENT_ACTIVITY_LIMIT,
  searchQuery = '',
}: UsePerpsHomeDataParams = {}): UsePerpsHomeDataReturn => {
  // Fetch positions via WebSocket with throttling for performance
  const { positions, isInitialLoading: isPositionsLoading } =
    usePerpsLivePositions({
      throttleMs: 1000, // Throttle updates to once per second
    });

  // Fetch orders via WebSocket (excluding TP/SL orders)
  const { orders: allOrders, isInitialLoading: isOrdersLoading } =
    usePerpsLiveOrders({
      throttleMs: 1000,
      hideTpSl: true, // Hide Take Profit and Stop Loss orders from home screen
    });

  // Fetch recent activity (order fills) via WebSocket
  const { fills: allFills, isInitialLoading: isActivityLoading } =
    usePerpsLiveFills({
      throttleMs: 1000,
    });

  // Fetch markets data for trending section (markets don't need real-time updates)
  // Volume filtering is handled at the data layer in usePerpsMarkets
  const {
    markets: allMarkets,
    isLoading: isMarketsLoading,
    refresh: refreshMarkets,
  } = usePerpsMarkets({
    skipInitialFetch: false,
    showZeroVolume: __DEV__,
  });

  // Get watchlist symbols from Redux
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  // Get saved market filter preferences
  const savedSortPreference = useSelector(selectPerpsMarketFilterPreferences);

  // Filter markets that are in watchlist
  const watchlistMarkets = useMemo(
    () =>
      allMarkets.filter((market) => watchlistSymbols.includes(market.symbol)),
    [allMarkets, watchlistSymbols],
  );

  // Derive sort field and direction from saved preference
  const { sortBy, direction } = useMemo(() => {
    const sortOption = MARKET_SORTING_CONFIG.SORT_OPTIONS.find(
      (opt) => opt.id === savedSortPreference,
    );

    return {
      sortBy: sortOption?.field ?? MARKET_SORTING_CONFIG.SORT_FIELDS.VOLUME,
      direction:
        sortOption?.direction ?? MARKET_SORTING_CONFIG.DEFAULT_DIRECTION,
    };
  }, [savedSortPreference]);

  // Filter and sort markets by type
  // Perps (crypto) - exclude all non-crypto markets
  const perpsMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter((m) => !m.marketType), // Crypto markets have no marketType
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Stocks (equity) - top N by user preference
  const stocksMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter((m) => m.marketType === 'equity'),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Commodities - top N by user preference
  const commoditiesMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter((m) => m.marketType === 'commodity'),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Stocks & Commodities combined - top N by user preference
  const stocksAndCommoditiesMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter(
          (m) => m.marketType === 'equity' || m.marketType === 'commodity',
        ),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Forex - top N by user preference
  const forexMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter((m) => m.marketType === 'forex'),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Refresh markets data (WebSocket data auto-updates, only markets need manual refresh)
  const refresh = useCallback(async () => {
    await refreshMarkets();
  }, [refreshMarkets]);

  // Filter data by search query with type-safe field access
  const filterBySearchQuery = useCallback(
    (query: string) => {
      if (!query.trim()) {
        return {
          positions,
          orders: allOrders,
          watchlistMarkets, // Show all watchlisted markets
          markets: perpsMarkets, // Show top 5 perps (crypto) when no search
          fills: allFills,
        };
      }

      const lowerQuery = query.toLowerCase().trim();

      return {
        // Position only has 'coin' field (no 'symbol')
        positions: positions.filter((pos: Position) =>
          pos.coin?.toLowerCase().includes(lowerQuery),
        ),
        // Order only has 'symbol' field (no 'coin')
        orders: allOrders.filter((order: Order) =>
          order.symbol?.toLowerCase().includes(lowerQuery),
        ),
        // Filter watchlist markets by search query
        watchlistMarkets: watchlistMarkets.filter(
          (market: PerpsMarketData) =>
            market.symbol?.toLowerCase().includes(lowerQuery) ||
            market.name?.toLowerCase().includes(lowerQuery),
        ),
        // Market has both 'symbol' and 'name'
        // Search through ALL markets, not just top 5 trending
        markets: allMarkets.filter(
          (market: PerpsMarketData) =>
            market.symbol?.toLowerCase().includes(lowerQuery) ||
            market.name?.toLowerCase().includes(lowerQuery),
        ),
        // OrderFill only has 'symbol' field (no 'coin' or 'asset')
        fills: allFills.filter((fill: OrderFill) =>
          fill.symbol?.toLowerCase().includes(lowerQuery),
        ),
      };
    },
    [
      positions,
      allOrders,
      watchlistMarkets,
      perpsMarkets,
      allMarkets,
      allFills,
    ],
  );

  // Apply filtering and limits
  const filteredData = useMemo(
    () => filterBySearchQuery(searchQuery),
    [filterBySearchQuery, searchQuery],
  );

  const limitedPositions = useMemo(
    () => filteredData.positions.slice(0, positionsLimit),
    [filteredData.positions, positionsLimit],
  );
  const limitedOrders = useMemo(
    () => filteredData.orders.slice(0, ordersLimit),
    [filteredData.orders, ordersLimit],
  );
  const limitedWatchlistMarkets = useMemo(
    () => filteredData.watchlistMarkets,
    [filteredData.watchlistMarkets],
  );
  const limitedActivity = useMemo(
    () => filteredData.fills.slice(0, activityLimit),
    [filteredData.fills, activityLimit],
  );

  // When searching, split filtered markets by type
  const searchedPerpsMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return perpsMarkets;
    }
    return filteredData.markets.filter((m) => !m.marketType);
  }, [searchQuery, perpsMarkets, filteredData.markets]);

  const searchedStocksMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return stocksMarkets;
    }
    return filteredData.markets.filter((m) => m.marketType === 'equity');
  }, [searchQuery, stocksMarkets, filteredData.markets]);

  const searchedCommoditiesMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return commoditiesMarkets;
    }
    return filteredData.markets.filter((m) => m.marketType === 'commodity');
  }, [searchQuery, commoditiesMarkets, filteredData.markets]);

  const searchedStocksAndCommoditiesMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return stocksAndCommoditiesMarkets;
    }
    return filteredData.markets.filter(
      (m) => m.marketType === 'equity' || m.marketType === 'commodity',
    );
  }, [searchQuery, stocksAndCommoditiesMarkets, filteredData.markets]);

  const searchedForexMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return forexMarkets;
    }
    return filteredData.markets.filter((m) => m.marketType === 'forex');
  }, [searchQuery, forexMarkets, filteredData.markets]);

  return {
    positions: limitedPositions,
    orders: limitedOrders,
    watchlistMarkets: limitedWatchlistMarkets,
    perpsMarkets: searchedPerpsMarkets, // Crypto markets (renamed from trendingMarkets)
    stocksMarkets: searchedStocksMarkets,
    commoditiesMarkets: searchedCommoditiesMarkets,
    stocksAndCommoditiesMarkets: searchedStocksAndCommoditiesMarkets,
    forexMarkets: searchedForexMarkets,
    recentActivity: limitedActivity,
    sortBy,
    isLoading: {
      positions: isPositionsLoading,
      orders: isOrdersLoading,
      markets: isMarketsLoading,
      activity: isActivityLoading,
    },
    refresh,
  };
};
