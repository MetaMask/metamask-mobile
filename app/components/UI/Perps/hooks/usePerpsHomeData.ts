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
import { sortMarkets } from '../utils/sortMarkets';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';

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
  trendingMarkets: PerpsMarketData[];
  recentActivity: OrderFill[];
  isLoading: {
    positions: boolean;
    markets: boolean;
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
  const allOrders = usePerpsLiveOrders({
    throttleMs: 1000,
    hideTpSl: true, // Hide Take Profit and Stop Loss orders from home screen
  });

  // Fetch recent activity (order fills) via WebSocket
  const allFills = usePerpsLiveFills({
    throttleMs: 1000,
  });

  // Fetch markets data for trending section (markets don't need real-time updates)
  const {
    markets: allMarkets,
    isLoading: isMarketsLoading,
    refresh: refreshMarkets,
  } = usePerpsMarkets({
    skipInitialFetch: false,
  });

  // Get watchlist symbols from Redux
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  // Filter markets that are in watchlist
  const watchlistMarkets = useMemo(
    () =>
      allMarkets.filter((market) => watchlistSymbols.includes(market.symbol)),
    [allMarkets, watchlistSymbols],
  );

  // Sort markets and apply limit for trending section
  const trendingMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets,
        sortBy: MARKET_SORTING_CONFIG.SORT_FIELDS.VOLUME,
        direction: MARKET_SORTING_CONFIG.DEFAULT_DIRECTION,
      }).slice(0, trendingLimit),
    [allMarkets, trendingLimit],
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
          markets: trendingMarkets, // Show top 5 trending when no search
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
      trendingMarkets,
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
  const limitedMarkets = useMemo(
    () => filteredData.markets.slice(0, trendingLimit),
    [filteredData.markets, trendingLimit],
  );
  const limitedActivity = useMemo(
    () => filteredData.fills.slice(0, activityLimit),
    [filteredData.fills, activityLimit],
  );

  return {
    positions: limitedPositions,
    orders: limitedOrders,
    watchlistMarkets: limitedWatchlistMarkets,
    trendingMarkets: limitedMarkets,
    recentActivity: limitedActivity,
    isLoading: {
      positions: isPositionsLoading,
      markets: isMarketsLoading,
    },
    refresh,
  };
};
