import { useCallback, useEffect, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { type PerpsMarketData } from '@metamask/perps-controller';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import {
  hasPreloadedData,
  getPreloadedData,
} from './stream/hasCachedPerpsData';
import { filterAndSortMarkets } from '../utils/filterAndSortMarkets';

export type PerpsMarketDataWithVolumeNumber = PerpsMarketData & {
  volumeNumber: number;
};

export interface UsePerpsMarketsResult {
  /**
   * Transformed market data ready for UI consumption
   */
  markets: PerpsMarketDataWithVolumeNumber[];
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
  /**
   * Show markets with zero or invalid volume
   * @default __DEV__ (true in development, false in production)
   */
  showZeroVolume?: boolean;
}

// Re-export parseVolume for backward compatibility
export { parseVolume } from '@metamask/perps-controller';

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
    showZeroVolume = __DEV__, // Show zero-volume markets in development mode
  } = options;

  const streamManager = usePerpsStream();
  const [markets, setMarkets] = useState<PerpsMarketDataWithVolumeNumber[]>(
    () => {
      const cached = getPreloadedData<PerpsMarketData[]>('cachedMarketData');
      if (!cached) return [];
      return filterAndSortMarkets({ marketData: cached, showZeroVolume });
    },
  );
  const [isLoading, setIsLoading] = useState(() => {
    if (skipInitialFetch) return false;
    return !hasPreloadedData('cachedMarketData');
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to filter and sort markets by volume
  const sortMarketsByVolume = useCallback(
    (marketData: PerpsMarketData[]) =>
      filterAndSortMarkets({ marketData, showZeroVolume }),
    [showZeroVolume],
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

    let isFirstUpdate = true;
    const subscriptionStartTime = Date.now();

    const unsubscribe = streamManager.marketData.subscribe({
      callback: (marketData) => {
        const receiveTime = Date.now();
        const timeToData = receiveTime - subscriptionStartTime;
        if (marketData && marketData.length > 0) {
          const sortedMarkets = sortMarketsByVolume(marketData);
          setMarkets(sortedMarkets);
          setIsLoading(false);
          setError(null);

          if (isFirstUpdate) {
            DevLogger.log('Perps: Market data received (first load)', {
              marketCount: marketData.length,
              timeToDataMs: timeToData,
              source: timeToData < 100 ? 'cache' : 'fresh_fetch',
              cacheHit: timeToData < 100,
            });
            isFirstUpdate = false;
          } else {
            DevLogger.log('Perps: Market data updated', {
              marketCount: marketData.length,
            });
          }
        } else if (marketData) {
          // Empty array
          setMarkets([]);
          setIsLoading(false);
          if (isFirstUpdate) {
            DevLogger.log('Perps: No market data available', {
              timeToDataMs: timeToData,
            });
            isFirstUpdate = false;
          }
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
