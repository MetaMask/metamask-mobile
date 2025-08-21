import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { PerpsMarketData } from '../controllers/types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

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

        // Sort markets by 24h volume (highest first)
        const sortedMarkets = [...marketDataWithPrices].sort((a, b) => {
          // Helper function to parse volume string and convert to number
          const getVolumeNumber = (volumeStr: string | undefined): number => {
            if (!volumeStr) return -1; // Put undefined at the end

            // Handle special cases
            if (volumeStr === PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY) return -1; // Put missing data at the end
            if (volumeStr === '$<1') return 0.5; // Treat as very small but not zero

            // Remove $ and commas, handle different suffixes
            const cleaned = volumeStr.replace(/[$,]/g, '');

            // Handle billion (B), million (M), thousand (K) suffixes
            if (cleaned.includes('B')) {
              return parseFloat(cleaned.replace('B', '')) * 1e9;
            }
            if (cleaned.includes('M')) {
              return parseFloat(cleaned.replace('M', '')) * 1e6;
            }
            if (cleaned.includes('K')) {
              return parseFloat(cleaned.replace('K', '')) * 1e3;
            }

            // Plain number without suffix (including 0)
            const num = parseFloat(cleaned);
            return isNaN(num) ? -1 : num;
          };

          const volumeA = getVolumeNumber(a.volume);
          const volumeB = getVolumeNumber(b.volume);

          return volumeB - volumeA; // Descending order
        });

        setMarkets(sortedMarkets);

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
    [],
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
