import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type { OrderBookData } from '../../controllers/types';

// Re-export types from controllers/types for backwards compatibility
export type { OrderBookData, OrderBookLevel } from '../../controllers/types';

export interface UsePerpsLiveOrderBookOptions {
  /** Symbol to subscribe to (e.g., 'BTC', 'ETH') */
  symbol: string;
  /** Number of levels to display (default: 10) */
  levels?: number;
  /** Price aggregation significant figures (default: 5). Higher = finer granularity */
  nSigFigs?: number;
  /** Throttle updates in milliseconds (default: 100ms for real-time feel) */
  throttleMs?: number;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
}

export interface UsePerpsLiveOrderBookReturn {
  /** Order book data */
  orderBook: OrderBookData | null;
  /** Whether the initial data is still loading */
  isLoading: boolean;
  /** Error if subscription failed */
  error: Error | null;
}

/**
 * Hook for subscribing to full order book depth data
 *
 * Provides real-time Level 2 order book data with bid/ask levels,
 * cumulative totals for depth chart visualization, and spread calculations.
 *
 * Uses the PerpsController.subscribeToOrderBook method which follows
 * the proper architecture pattern (Controller -> Provider -> Service).
 *
 * @param options - Configuration options for the hook
 * @returns Order book data with loading and error states
 *
 * @example
 * ```typescript
 * const { orderBook, isLoading, error } = usePerpsLiveOrderBook({
 *   symbol: 'BTC',
 *   levels: 10,
 *   throttleMs: 100,
 * });
 *
 * if (orderBook) {
 *   console.log('Best bid:', orderBook.bids[0]?.price);
 *   console.log('Best ask:', orderBook.asks[0]?.price);
 *   console.log('Spread:', orderBook.spread);
 * }
 * ```
 */
export function usePerpsLiveOrderBook(
  options: UsePerpsLiveOrderBookOptions,
): UsePerpsLiveOrderBookReturn {
  const {
    symbol,
    levels = 10,
    nSigFigs = 5,
    throttleMs = 100,
    enabled = true,
  } = options;

  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for throttling
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<OrderBookData | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled update function
  const applyUpdate = useCallback(
    (data: OrderBookData) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= throttleMs) {
        // Enough time has passed, apply immediately
        setOrderBook(data);
        lastUpdateRef.current = now;
        setIsLoading(false);
      } else {
        // Store pending update and schedule
        pendingUpdateRef.current = data;

        if (!throttleTimerRef.current) {
          const remainingTime = throttleMs - timeSinceLastUpdate;
          throttleTimerRef.current = setTimeout(() => {
            if (pendingUpdateRef.current) {
              setOrderBook(pendingUpdateRef.current);
              lastUpdateRef.current = Date.now();
              pendingUpdateRef.current = null;
              setIsLoading(false);
            }
            throttleTimerRef.current = null;
          }, remainingTime);
        }
      }
    },
    [throttleMs],
  );

  useEffect(() => {
    if (!symbol || !enabled) {
      setOrderBook(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    DevLogger.log(`usePerpsLiveOrderBook: Subscribing to ${symbol}`, {
      levels,
      nSigFigs,
      throttleMs,
    });

    let unsubscribe: (() => void) | null = null;

    try {
      const controller = Engine.context.PerpsController;

      // Use the controller's subscribeToOrderBook method which follows
      // proper architecture: Controller -> Provider -> SubscriptionService
      unsubscribe = controller.subscribeToOrderBook({
        symbol,
        levels,
        nSigFigs,
        callback: (data: OrderBookData) => {
          applyUpdate(data);
        },
        onError: (err: Error) => {
          DevLogger.log('usePerpsLiveOrderBook: Subscription error', err);
          setError(err);
          setIsLoading(false);
        },
      });

      DevLogger.log(`usePerpsLiveOrderBook: Subscribed to ${symbol}`);
    } catch (err) {
      const catchError = err instanceof Error ? err : new Error(String(err));
      DevLogger.log('usePerpsLiveOrderBook: Setup error', catchError);
      setError(catchError);
      setIsLoading(false);
    }

    return () => {
      DevLogger.log(`usePerpsLiveOrderBook: Unsubscribing from ${symbol}`);

      // Clear throttle timer
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      pendingUpdateRef.current = null;

      // Unsubscribe from WebSocket
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol, levels, nSigFigs, enabled, applyUpdate, throttleMs]);

  return useMemo(
    () => ({
      orderBook,
      isLoading,
      error,
    }),
    [orderBook, isLoading, error],
  );
}

export default usePerpsLiveOrderBook;
