import { useCallback, useEffect, useMemo, useState } from 'react';
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
  PerpsMarketData,
  OrderFill,
} from '../controllers/types';
import type { PerpsTransaction } from '../types/transactionHistory';
import { transformFillsToTransactions } from '../utils/transactionTransforms';
import Engine from '../../../../core/Engine';
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
  recentActivity: PerpsTransaction[];
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

  // Fetch fills via WebSocket for recent activity (instant updates, already cached)
  const { fills: liveFills, isInitialLoading: isFillsLoading } =
    usePerpsLiveFills({
      throttleMs: 0, // No throttle for instant activity updates
    });

  // REST API fills state - WebSocket snapshot only contains recent fills,
  // so we need to fetch complete history via REST API
  const [restFills, setRestFills] = useState<OrderFill[]>([]);
  const [isRestFillsLoading, setIsRestFillsLoading] = useState(true);

  // Fetch historical fills via REST API on mount
  // This ensures we have complete fill history, not just WebSocket snapshot
  useEffect(() => {
    const fetchFills = async () => {
      try {
        const controller = Engine.context.PerpsController;
        const provider = controller?.getActiveProvider();
        if (!provider) {
          setIsRestFillsLoading(false);
          return;
        }

        const fills = await provider.getOrderFills({ aggregateByTime: false });
        setRestFills(fills);
      } catch (error) {
        // Log error but don't fail - WebSocket fills still work
        console.error('[usePerpsHomeData] Failed to fetch REST fills:', error);
      } finally {
        setIsRestFillsLoading(false);
      }
    };
    fetchFills();
  }, []);

  // Merge REST + WebSocket fills with deduplication
  // Live fills take precedence over REST fills (more up-to-date)
  const mergedFills = useMemo(() => {
    // Use Map for efficient deduplication
    const fillsMap = new Map<string, OrderFill>();

    // Add REST fills first
    for (const fill of restFills) {
      const key = `${fill.orderId}-${fill.timestamp}`;
      fillsMap.set(key, fill);
    }

    // Add live fills (overwrites duplicates from REST - live data is fresher)
    for (const fill of liveFills) {
      const key = `${fill.orderId}-${fill.timestamp}`;
      fillsMap.set(key, fill);
    }

    // Convert back to array and sort by timestamp descending (newest first)
    return Array.from(fillsMap.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }, [restFills, liveFills]);

  // Transform merged fills to PerpsTransaction format for activity display
  const tradesOnly = useMemo(
    () => transformFillsToTransactions(mergedFills),
    [mergedFills],
  );

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
          transactions: tradesOnly, // Only trades, same as Trades tab
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
        // Filter trades only (same as Trades tab)
        transactions: tradesOnly.filter((transaction: PerpsTransaction) =>
          transaction.asset?.toLowerCase().includes(lowerQuery),
        ),
      };
    },
    [
      positions,
      allOrders,
      watchlistMarkets,
      perpsMarkets,
      allMarkets,
      tradesOnly,
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
    () => filteredData.transactions.slice(0, activityLimit),
    [filteredData.transactions, activityLimit],
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
      activity: isFillsLoading || isRestFillsLoading,
    },
    refresh,
  };
};
