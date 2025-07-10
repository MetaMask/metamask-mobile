import { useState, useEffect, useCallback } from 'react';
import { PerpsMarketData } from '../components/PerpsMarketListView/PerpsMarketListView.types';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';

export interface UsePerpsMarketsResult {
  /**
   * Transformed market data ready for UI consumption
   */
  markets: PerpsMarketData[];
  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;
  /**
   * Error state with error message
   */
  error: string | null;
  /**
   * Refresh function to manually refetch data
   */
  refresh: () => Promise<void>;
  /**
   * Indicates if data is being refreshed
   */
  isRefreshing: boolean;
}

export interface UsePerpsMarketsOptions {
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 60000 (1 minute)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
}

/**
 * Custom hook to fetch and manage Perps market data from HyperLiquid
 * Uses the singleton SDK clients for efficient resource management
 */
export const usePerpsMarkets = (
  options: UsePerpsMarketsOptions = {},
): UsePerpsMarketsResult => {
  const {
    enablePolling = false,
    pollingInterval = 60000, // 1 minute default
    skipInitialFetch = false,
  } = options;

  const [markets, setMarkets] = useState<PerpsMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        Logger.log('Perps: Fetching market data from HyperLiquid...');

        // For now, use the existing getMarkets method
        // TODO: Add a new method to get raw market data with prices and volumes
        const controller = Engine.context.PerpsController;
        const marketInfos = await controller.getMarkets();

        // Convert MarketInfo[] to PerpsMarketData[] with placeholder data
        // This is a temporary solution until we can access the raw HyperLiquid data
        const transformedMarkets: PerpsMarketData[] = marketInfos.map(
          (market) => ({
            symbol: market.name,
            name: market.name,
            maxLeverage: `${market.maxLeverage}x`,
            price: '$0.00', // Placeholder - need real price data
            change24h: '$0.00', // Placeholder - need real change data
            change24hPercent: '0.00%', // Placeholder - need real percentage data
            volume: '$0', // Placeholder - need real volume data
          }),
        );

        setMarkets(transformedMarkets);

        Logger.log('Perps: Successfully fetched and transformed market data', {
          marketCount: transformedMarkets.length,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        Logger.log('Perps: Failed to fetch market data', err);

        // Keep existing data on error to prevent UI flash
        if (markets.length === 0) {
          setMarkets([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [markets.length],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchMarketData(true),
    [fetchMarketData],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchMarketData();
    }
  }, [fetchMarketData, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(() => {
      fetchMarketData(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchMarketData]);

  return {
    markets,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};
