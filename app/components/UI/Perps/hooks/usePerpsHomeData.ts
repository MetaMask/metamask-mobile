import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsLiveFills,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import {
  MARKET_SORTING_CONFIG,
  MarketCategory,
  sortMarkets,
  type Position,
  type Order,
  type PerpsMarketData,
  type OrderFill,
  type SortField,
} from '@metamask/perps-controller';

import type { PerpsTransaction } from '../types/transactionHistory';
import {
  transformFillsToTransactions,
  mergeOrderFills,
} from '../utils/transactionTransforms';
import Engine from '../../../../core/Engine';
import { HOME_SCREEN_CONFIG } from '../constants/perpsConfig';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';
import { usePerpsConnection } from './usePerpsConnection';
import { getSuggestedWatchlistMarkets } from '../utils/marketUtils';
import { isWithinLast30Days } from '../utils/time';

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
  /** Top 5 markets by 24h volume, used as suggestions when watchlist is empty */
  suggestedWatchlistMarkets: PerpsMarketData[];
  perpsMarkets: PerpsMarketData[]; // Crypto markets (renamed from trending)
  stocksMarkets: PerpsMarketData[]; // Equity markets
  commoditiesMarkets: PerpsMarketData[]; // Commodity markets
  stocksAndCommoditiesMarkets: PerpsMarketData[]; // Combined stocks & commodities markets
  forexMarkets: PerpsMarketData[]; // Forex markets
  /** Markets listed within the last 30 days, sorted newest first. Empty when no markets qualify. */
  recentlyAddedMarkets: PerpsMarketData[];
  /**
   * True when the raw (unfiltered) market list is non-empty. Reflects the
   * full set that PerpsTopMoversSection ranks, including HIP-3 and any market
   * type not bucketed into the home-screen explore slices.
   */
  hasMarkets: boolean;
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
  positionsLimit,
  ordersLimit,
  trendingLimit = HOME_SCREEN_CONFIG.TrendingMarketsLimit,
  activityLimit = HOME_SCREEN_CONFIG.RecentActivityLimit,
  searchQuery = '',
}: UsePerpsHomeDataParams = {}): UsePerpsHomeDataReturn => {
  // Get connection state to guard REST calls that require an initialized controller
  const { isConnected, isInitialized, isConnecting } = usePerpsConnection();

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
      hideReduceOnly: true, // Hide all reduce-only orders from home screen
    });

  // Fetch fills via WebSocket for recent activity (instant updates, already cached)
  const { fills: liveFills, isInitialLoading: isFillsLoading } =
    usePerpsLiveFills({
      throttleMs: 0, // No throttle for instant activity updates
    });

  // REST API fills state - WebSocket snapshot only contains recent fills,
  // so we need to fetch complete history via REST API
  const [restFills, setRestFills] = useState<OrderFill[]>([]);

  // Fetch historical fills via REST API on mount (background, non-blocking)
  // This ensures we have complete fill history, not just WebSocket snapshot
  // Note: We don't track loading state - WebSocket data displays immediately,
  // REST fills merge silently in the background via mergedFills
  useEffect(() => {
    // Clear REST history whenever the perps context is reconnecting so we
    // never blend the previous account/provider's fills into the new context.
    if (!isConnected || !isInitialized || isConnecting) {
      setRestFills([]);
      return;
    }

    let isMounted = true;
    const fetchFills = async () => {
      try {
        const controller = Engine.context.PerpsController;
        if (!controller?.getActiveProviderOrNull()) {
          return;
        }

        // Route through the controller so the MarketDataService request-coalesce
        // layer absorbs bursty mounts.
        const fills = await controller.getOrderFills({
          aggregateByTime: false,
        });
        if (isMounted) {
          setRestFills(fills);
        }
      } catch (error) {
        // Log error but don't fail - WebSocket fills still work
        console.error('[usePerpsHomeData] Failed to fetch REST fills:', error);
      }
    };
    fetchFills();
    return () => {
      isMounted = false;
    };
  }, [isConnected, isInitialized, isConnecting]);

  const mergedFills = useMemo(
    () => mergeOrderFills(restFills, liveFills),
    [restFills, liveFills],
  );

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

  // Filter markets that are in watchlist
  const watchlistMarkets = useMemo(
    () =>
      allMarkets.filter((market) => watchlistSymbols.includes(market.symbol)),
    [allMarkets, watchlistSymbols],
  );

  // Top markets by volume — shown as suggestions below the watchlist.
  // Excludes already-watchlisted markets so the list shrinks as items are added.
  const suggestedWatchlistMarkets = useMemo(
    () => getSuggestedWatchlistMarkets(allMarkets, watchlistSymbols),
    [allMarkets, watchlistSymbols],
  );

  const sortBy = MARKET_SORTING_CONFIG.SortFields.Volume;
  const direction = MARKET_SORTING_CONFIG.DefaultDirection;

  // Filter and sort markets by type
  // Perps (crypto) - exclude all non-crypto markets
  const perpsMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter((m) => !m.marketType && !m.isHip3),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Stocks - top N by user preference
  const stocksMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter(
          (market) => market.marketType === MarketCategory.Stock,
        ),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Commodities - top N by user preference
  const commoditiesMarkets = useMemo(
    () =>
      sortMarkets({
        markets: allMarkets.filter(
          (market) => market.marketType === MarketCategory.Commodity,
        ),
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
          (market) =>
            market.marketType === MarketCategory.Stock ||
            market.marketType === MarketCategory.Commodity,
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
        markets: allMarkets.filter(
          (m) => m.marketType === MarketCategory.Forex,
        ),
        sortBy,
        direction,
      }).slice(0, trendingLimit),
    [allMarkets, sortBy, direction, trendingLimit],
  );

  // Markets listed within the last 30 days, sorted newest first (largest listedAt first).
  // Markets without a listedAt timestamp are excluded entirely.
  const recentlyAddedMarkets = useMemo(
    () =>
      allMarkets
        .filter(
          (m) => m.listedAt !== undefined && isWithinLast30Days(m.listedAt),
        )
        .sort((a, b) => (b.listedAt as number) - (a.listedAt as number)),
    [allMarkets],
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
        // Position has 'symbol' field
        positions: positions.filter((pos: Position) =>
          pos.symbol?.toLowerCase().includes(lowerQuery),
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

  // The Perps home screen renders positions/orders in a vertical ScrollView with
  // no "see all" page, so it must show every open position/order. Only apply a
  // cap when a caller explicitly passes a finite limit (default: no cap).
  const limitedPositions = useMemo(
    () =>
      positionsLimit === undefined
        ? filteredData.positions
        : filteredData.positions.slice(0, positionsLimit),
    [filteredData.positions, positionsLimit],
  );
  const limitedOrders = useMemo(
    () =>
      ordersLimit === undefined
        ? filteredData.orders
        : filteredData.orders.slice(0, ordersLimit),
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
    return filteredData.markets.filter((m) => !m.marketType && !m.isHip3);
  }, [searchQuery, perpsMarkets, filteredData.markets]);

  const searchedStocksMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return stocksMarkets;
    }
    return filteredData.markets.filter(
      (market) => market.marketType === MarketCategory.Stock,
    );
  }, [searchQuery, stocksMarkets, filteredData.markets]);

  const searchedCommoditiesMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return commoditiesMarkets;
    }
    return filteredData.markets.filter(
      (m) => m.marketType === MarketCategory.Commodity,
    );
  }, [searchQuery, commoditiesMarkets, filteredData.markets]);

  const searchedStocksAndCommoditiesMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return stocksAndCommoditiesMarkets;
    }
    return filteredData.markets.filter(
      (market) =>
        market.marketType === MarketCategory.Stock ||
        market.marketType === MarketCategory.Commodity,
    );
  }, [searchQuery, stocksAndCommoditiesMarkets, filteredData.markets]);

  const searchedForexMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return forexMarkets;
    }
    return filteredData.markets.filter(
      (m) => m.marketType === MarketCategory.Forex,
    );
  }, [searchQuery, forexMarkets, filteredData.markets]);

  return {
    positions: limitedPositions,
    orders: limitedOrders,
    watchlistMarkets: limitedWatchlistMarkets,
    suggestedWatchlistMarkets,
    perpsMarkets: searchedPerpsMarkets, // Crypto markets (renamed from trendingMarkets)
    stocksMarkets: searchedStocksMarkets,
    commoditiesMarkets: searchedCommoditiesMarkets,
    stocksAndCommoditiesMarkets: searchedStocksAndCommoditiesMarkets,
    forexMarkets: searchedForexMarkets,
    recentlyAddedMarkets,
    hasMarkets: allMarkets.length > 0,
    recentActivity: limitedActivity,
    sortBy,
    // Hooks handle reconnection internally: clearCache() sends null →
    // callback sets isInitialLoading=true. No need to override with
    // isConnecting, which would defeat disk-cache instant display on
    // cold start (isConnecting is true while WS connects, but cached
    // data is already available).
    isLoading: {
      positions: isPositionsLoading,
      orders: isOrdersLoading,
      markets: isMarketsLoading,
      activity: isFillsLoading || isConnecting,
    },
    refresh,
  };
};
