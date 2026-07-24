import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  type OrderBookData,
  type OrderBookConnectionStatus,
} from '@metamask/perps-controller';
import { getAggregatedOrderBookConnection } from '../../services/aggregatedOrderBookConnection';

// Re-export types from controllers/types for backwards compatibility
export {
  type OrderBookData,
  type OrderBookLevel,
} from '@metamask/perps-controller';
export type { OrderBookConnectionStatus } from '@metamask/perps-controller';

export interface UsePerpsLiveOrderBookOptions {
  /** Symbol to subscribe to (e.g., 'BTC', 'ETH') */
  symbol: string;
  /** Number of levels to display (default: 10) */
  levels?: number;
  /** Price aggregation significant figures (2-5, default: 5). Higher = finer granularity */
  nSigFigs?: 2 | 3 | 4 | 5;
  /** Mantissa for aggregation when nSigFigs is 5 (2 or 5). Controls finest price increments */
  mantissa?: 2 | 5;
  /** Throttle updates in milliseconds (default: 100ms for real-time feel) */
  throttleMs?: number;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /**
   * Enable Hyperliquid's fast order book stream (5 levels @ ~0.5s cadence).
   * When omitted, uses the default cadence (20 levels @ ~2s).
   * Note: with `fast: true` the book returns at most 5 levels per side
   * regardless of the `levels` setting.
   *
   * Ignored when `channel` is `'orderBookAggregated'` — that path always uses
   * the dedicated aggregated connection's fast stream.
   */
  fast?: boolean;
  /**
   * Which order-book channel to subscribe to (default: `'orderBook'`).
   * `'orderBook'` is the raw / full-precision book via the controller's shared
   * socket (used for mid, spread, slippage). `'orderBookAggregated'` is the
   * server-aggregated book on a dedicated socket so the raw channel is never
   * coarsened (Pro ladder panel).
   */
  channel?: 'orderBook' | 'orderBookAggregated';
}

export interface UsePerpsLiveOrderBookReturn {
  /** Order book data */
  orderBook: OrderBookData | null;
  /** Whether the initial data is still loading */
  isLoading: boolean;
  /** Error if subscription failed */
  error: Error | null;
  /**
   * Health of the underlying stream. Only meaningful for the
   * `orderBookAggregated` channel; the raw channel always reports `connected`.
   */
  connectionStatus: OrderBookConnectionStatus;
  /**
   * Re-establishes the stream after a dropped connection. Tears the current
   * subscription down and re-subscribes (rebuilding the dedicated socket for
   * the aggregated channel).
   */
  reconnect: () => void;
}

/**
 * Hook for subscribing to full order book depth data
 *
 * Provides real-time Level 2 order book data with bid/ask levels,
 * cumulative totals for depth chart visualization, and spread calculations.
 *
 * Uses `PerpsController.subscribeToOrderBook` for the raw channel, and a
 * dedicated `AggregatedOrderBookConnection` for the aggregated channel
 * (same dual-socket approach as Extension).
 *
 * @param options - Configuration options for the hook
 * @returns Order book data with loading and error states
 */
export function usePerpsLiveOrderBook(
  options: UsePerpsLiveOrderBookOptions,
): UsePerpsLiveOrderBookReturn {
  const {
    symbol,
    levels = 10,
    nSigFigs = 5,
    mantissa,
    throttleMs = 100,
    enabled = true,
    fast = false,
    channel = 'orderBook',
  } = options;

  const isAggregated = channel === 'orderBookAggregated';

  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<OrderBookConnectionStatus>('connecting');
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const reconnect = useCallback(() => {
    setReconnectNonce((nonce) => nonce + 1);
  }, []);

  // Use refs for throttling
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<OrderBookData | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttled update function
  const applyUpdate = useCallback(
    (data: OrderBookData) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= throttleMs) {
        setOrderBook(data);
        lastUpdateRef.current = now;
        setIsLoading(false);
      } else {
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
      setConnectionStatus(isAggregated ? 'connecting' : 'connected');
      return;
    }

    setOrderBook(null);
    setIsLoading(true);
    setError(null);
    setConnectionStatus(isAggregated ? 'connecting' : 'connected');

    DevLogger.log(
      `usePerpsLiveOrderBook: Subscribing to ${symbol} (${channel})`,
      {
        levels,
        nSigFigs,
        mantissa,
        throttleMs,
        fast,
        channel,
      },
    );

    let unsubscribe: (() => void) | null = null;

    try {
      if (isAggregated) {
        const connection = getAggregatedOrderBookConnection();
        unsubscribe = connection.subscribe({
          symbol,
          levels,
          nSigFigs,
          mantissa,
          callback: (data: OrderBookData) => {
            applyUpdate(data);
          },
          onStatusChange: (status) => {
            setConnectionStatus(status);
          },
        });
      } else {
        const controller = Engine.context.PerpsController;
        unsubscribe = controller.subscribeToOrderBook({
          symbol,
          levels,
          nSigFigs,
          mantissa,
          fast,
          callback: (data: OrderBookData) => {
            applyUpdate(data);
          },
          onError: (err: Error) => {
            DevLogger.log('usePerpsLiveOrderBook: Subscription error', err);
            setError(err);
            setIsLoading(false);
          },
        });
      }

      DevLogger.log(
        `usePerpsLiveOrderBook: Subscribed to ${symbol} (${channel})`,
      );
    } catch (err) {
      const catchError = err instanceof Error ? err : new Error(String(err));
      DevLogger.log('usePerpsLiveOrderBook: Setup error', catchError);
      setError(catchError);
      setIsLoading(false);
      if (isAggregated) {
        setConnectionStatus('error');
      }
    }

    return () => {
      DevLogger.log(
        `usePerpsLiveOrderBook: Unsubscribing from ${symbol} (${channel})`,
      );

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      pendingUpdateRef.current = null;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    symbol,
    levels,
    nSigFigs,
    mantissa,
    enabled,
    applyUpdate,
    throttleMs,
    fast,
    channel,
    isAggregated,
    reconnectNonce,
  ]);

  return useMemo(
    () => ({
      orderBook,
      isLoading,
      error,
      connectionStatus: isAggregated ? connectionStatus : 'connected',
      reconnect,
    }),
    [orderBook, isLoading, error, connectionStatus, isAggregated, reconnect],
  );
}

export default usePerpsLiveOrderBook;
