import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { PerpsMarketData } from '../controllers/types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { usePerpsStream } from '../providers/PerpsStreamManager';

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
 * Uses the StreamManager's marketData channel for caching and deduplication
 */
export const usePerpsMarkets = (
  options: UsePerpsMarketsOptions = {},
): UsePerpsMarketsResult => {
  const {
    enablePolling = false,
    pollingInterval = 60000, // 1 minute default
    skipInitialFetch = false,
  } = options;

  const streamManager = usePerpsStream();
  const [markets, setMarkets] = useState<PerpsMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to sort markets by volume
  const sortMarketsByVolume = useCallback(
    (marketData: PerpsMarketData[]): PerpsMarketData[] =>
      [...marketData].sort((a, b) => {
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
      }),
    [],
  );

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Force refresh the market data
      await streamManager.marketData.refresh();

      DevLogger.log('Perps: Manual refresh completed');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      DevLogger.log('Perps: Failed to refresh market data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [streamManager.marketData]);

  // Subscribe to market data updates
  useEffect(() => {
    if (skipInitialFetch) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = streamManager.marketData.subscribe({
      callback: (marketData) => {
        if (marketData && marketData.length > 0) {
          const sortedMarkets = sortMarketsByVolume(marketData);
          setMarkets(sortedMarkets);
          setIsLoading(false);
          setError(null);

          DevLogger.log('Perps: Market data updated', {
            marketCount: marketData.length,
          });
        } else if (marketData) {
          // Empty array
          setMarkets([]);
          setIsLoading(false);
        }
      },
      throttleMs: 0, // No throttle for market data updates
    });

    return () => {
      unsubscribe();
    };
  }, [streamManager.marketData, sortMarketsByVolume, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(async () => {
      try {
        await streamManager.marketData.refresh();
      } catch (err) {
        DevLogger.log('Perps: Polling refresh failed', err);
      }
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, streamManager.marketData]);

  return {
    markets,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};
