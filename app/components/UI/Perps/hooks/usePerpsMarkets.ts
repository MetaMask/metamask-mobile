import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { PerpsMarketData } from '../controllers/types';

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
 * Custom hook to fetch and manage Perps market data from the active provider
 * Uses the PerpsController to get data from the currently active protocol
 * (HyperLiquid, GMX, dYdX, etc.)
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
        DevLogger.log('Perps: Fetching market data from active provider...');

        // Get the active provider via PerpsController
        const controller = Engine.context.PerpsController;
        const provider = controller.getActiveProvider();

        // Get markets with price data directly from the provider
        const marketDataWithPrices = await provider.getMarketDataWithPrices();

        setMarkets(marketDataWithPrices);

        DevLogger.log(
          'Perps: Successfully fetched and transformed market data',
          {
            marketCount: marketDataWithPrices.length,
          },
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch market data', err);

        // Keep existing data on error to prevent UI flash
        setMarkets((currentMarkets) => {
          if (currentMarkets.length === 0) {
            return [];
          }
          return currentMarkets;
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [], // Remove markets.length dependency to prevent unnecessary re-renders
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
