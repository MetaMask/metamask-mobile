import { useEffect, useState, useMemo, useRef } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { isTPSLOrder, type Order } from '@metamask/perps-controller';
import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';

// Stable empty array reference to prevent re-renders
const EMPTY_ORDERS: Order[] = [];

export interface UsePerpsLiveOrdersOptions {
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
  /** Filter out TP/SL orders (Stop Market, Stop Limit, Take Profit Limit) */
  hideTpSl?: boolean;
  /** Filter out all reduce-only orders */
  hideReduceOnly?: boolean;
}

export interface UsePerpsLiveOrdersReturn {
  /** Array of current orders */
  orders: Order[];
  /** Whether we're waiting for the first real WebSocket data (not cached) */
  isInitialLoading: boolean;
}

/**
 * Hook for real-time order updates via WebSocket subscription
 * Replaces the old polling-based usePerpsOpenOrders hook
 *
 * Orders update instantly by default since they don't change frequently
 * and users expect immediate feedback when placing/cancelling orders.
 *
 * @param options - Configuration options for the hook
 * @returns Object containing orders array and loading state
 */
export function usePerpsLiveOrders(
  options: UsePerpsLiveOrdersOptions = {},
): UsePerpsLiveOrdersReturn {
  const { throttleMs = 0, hideTpSl = false, hideReduceOnly = false } = options; // No throttling by default for instant updates
  const stream = usePerpsStream();
  const [orders, setOrders] = useState<Order[]>(
    () => getPreloadedData<Order[]>('cachedOrders') ?? EMPTY_ORDERS,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(
    () => !hasPreloadedData('cachedOrders'),
  );
  const lastOrdersRef = useRef<Order[]>(EMPTY_ORDERS);
  const hasReceivedFirstUpdate = useRef(false);

  useEffect(() => {
    const unsubscribe = stream.orders.subscribe({
      callback: (newOrders) => {
        // null/undefined means no cached data yet, keep loading state
        if (newOrders === null || newOrders === undefined) {
          // Keep isInitialLoading as true, orders as empty array
          return;
        }

        // We have real data now (either empty array or orders)
        if (!hasReceivedFirstUpdate.current) {
          hasReceivedFirstUpdate.current = true;
          setIsInitialLoading(false);
        }

        // Only update if orders actually changed
        // For empty arrays, use stable reference
        if (newOrders.length === 0) {
          if (lastOrdersRef.current.length === 0) {
            // Already empty, don't update
            return;
          }
          lastOrdersRef.current = EMPTY_ORDERS;
          setOrders(EMPTY_ORDERS);
        } else {
          lastOrdersRef.current = newOrders;
          setOrders(newOrders);
        }
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, throttleMs]);

  // Filter orders based on requested display options
  const filteredOrders = useMemo(() => {
    if (!hideTpSl && !hideReduceOnly) {
      return orders;
    }
    return orders.filter((order) => {
      if (hideTpSl && isTPSLOrder(order.detailedOrderType)) {
        return false;
      }

      if (hideReduceOnly && order.reduceOnly === true) {
        return false;
      }

      return true;
    });
  }, [orders, hideTpSl, hideReduceOnly]);

  return {
    orders: filteredOrders,
    isInitialLoading,
  };
}
