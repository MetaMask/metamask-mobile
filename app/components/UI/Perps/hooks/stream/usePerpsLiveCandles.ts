import { useEffect, useState, useRef, useCallback } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { CandleData } from '../../types/perps-types';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';

// Stable empty candle data reference to prevent re-renders
const EMPTY_CANDLE_DATA: CandleData = {
  symbol: '',
  interval: CandlePeriod.OneHour,
  candles: [],
};

export interface UsePerpsLiveCandlesOptions {
  /** The asset symbol (e.g., "BTC", "ETH") */
  symbol: string;
  /** The candle interval (e.g., "1m", "5m", "15m") */
  interval: CandlePeriod;
  /** The duration for historical data (e.g., "1d", "7d", "1M") - currently informational only */
  duration: TimeDuration;
  /** Throttle delay in milliseconds (default: 1000ms) */
  throttleMs?: number;
}

export interface UsePerpsLiveCandlesReturn {
  /** Candle data with historical and live updates */
  candleData: CandleData | null;
  /** Whether we're waiting for the first real WebSocket data */
  isLoading: boolean;
  /** Whether we're fetching additional historical candles */
  isLoadingMore: boolean;
  /** Whether we have received any historical data */
  hasHistoricalData: boolean;
  /** Error state (if any) */
  error: Error | null;
  /** Fetch more historical candles before the current oldest candle */
  fetchMoreHistory: () => Promise<void>;
  /** Retry subscription after error (useful for pull-to-refresh) */
  retry: () => void;
}

/**
 * Hook for real-time candle updates via WebSocket subscription
 * Replaces the old polling-based usePerpsPositionData hook
 *
 * This hook provides:
 * - Initial historical candle data via REST API
 * - Live candle updates via WebSocket
 * - Automatic cache sharing across components using the same coin+interval
 *
 * Example usage:
 * ```
 * const { candleData, isLoading } = usePerpsLiveCandles({
 *   symbol: 'BTC',
 *   interval: CandlePeriod.OneHour,
 *   duration: TimeDuration.OneDay,
 *   throttleMs: 1000
 * });
 * ```
 *
 * @param options - Configuration options for the hook
 * @returns Object containing candle data, loading state, and error state
 */
export function usePerpsLiveCandles(
  options: UsePerpsLiveCandlesOptions,
): UsePerpsLiveCandlesReturn {
  const { symbol, interval, duration, throttleMs = 1000 } = options;
  const stream = usePerpsStream();
  const [candleData, setCandleData] = useState<CandleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasReceivedFirstUpdate = useRef(false);
  // Retry key - incrementing this triggers a re-subscription
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Reset state immediately when symbol or interval changes to prevent stale data
    setCandleData(null);
    setIsLoading(true);
    setError(null);
    hasReceivedFirstUpdate.current = false;

    if (!symbol) {
      setCandleData(EMPTY_CANDLE_DATA);
      setIsLoading(false);
      return;
    }

    try {
      const unsubscribe = stream.candles.subscribe({
        symbol,
        interval,
        duration,
        callback: (newCandleData) => {
          // null/undefined means no cached data yet, keep loading state
          if (newCandleData === null || newCandleData === undefined) {
            return;
          }

          // DEFENSIVE: Validate incoming data matches current subscription
          // This prevents race conditions when switching symbols where old subscription
          // might deliver data after new subscription starts
          if (
            newCandleData.symbol !== symbol ||
            newCandleData.interval !== interval
          ) {
            DevLogger.log('usePerpsLiveCandles: REJECTED - Validation failed', {
              reason: 'Symbol or interval mismatch',
              expectedSymbol: symbol,
              receivedSymbol: newCandleData.symbol,
              expectedInterval: interval,
              receivedInterval: newCandleData.interval,
            });
            return;
          }

          // We have real data now (either empty array or candles)
          if (!hasReceivedFirstUpdate.current) {
            hasReceivedFirstUpdate.current = true;
            setIsLoading(false);
          }

          setCandleData(newCandleData);
        },
        throttleMs,
        onError: (err: Error) => {
          const errorInstance = ensureError(err);

          // Log to Sentry: async subscription initialization failure
          Logger.error(errorInstance, {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsLiveCandles',
            },
            context: {
              name: 'candle_subscription_async',
              data: {
                operation: 'subscribe_async_error',
                symbol,
                interval,
              },
            },
          });

          setError(errorInstance);
          setIsLoading(false);
        },
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));

      // Log to Sentry: subscription setup failure prevents live updates
      Logger.error(ensureError(errorInstance), {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'usePerpsLiveCandles',
        },
        context: {
          name: 'candle_subscription',
          data: {
            operation: 'subscribe',
            symbol,
            interval,
          },
        },
      });

      setError(errorInstance);
      setIsLoading(false);
      return;
    }
  }, [stream, symbol, interval, duration, throttleMs, retryKey]);

  const hasHistoricalData =
    candleData !== null && candleData.candles.length > 0;

  /**
   * Retry subscription after an error
   * Useful for pull-to-refresh when initial fetch failed
   */
  const retry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);

  /**
   * Fetch additional historical candles before the current oldest candle
   * Used when user scrolls to the left edge of the chart
   */
  const fetchMoreHistory = async (): Promise<void> => {
    if (!symbol || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      DevLogger.log('usePerpsLiveCandles: Fetching more historical candles', {
        symbol,
        interval,
        duration,
      });

      await stream.candles.fetchHistoricalCandles(symbol, interval, duration);

      DevLogger.log(
        'usePerpsLiveCandles: Successfully fetched more historical candles',
        { symbol, interval, duration },
      );
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      DevLogger.log('usePerpsLiveCandles: Error fetching more history', {
        symbol,
        interval,
        error: errorInstance.message,
      });
      setError(errorInstance);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    candleData,
    isLoading,
    isLoadingMore,
    hasHistoricalData,
    error,
    fetchMoreHistory,
    retry,
  };
}
