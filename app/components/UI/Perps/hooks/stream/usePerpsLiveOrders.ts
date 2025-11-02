import { useEffect, useState, useMemo } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { Order } from '../../controllers/types';
import { isTPSLOrder } from '../../constants/orderTypes';

export interface UsePerpsLiveOrdersOptions {
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
  /** Filter out TP/SL orders (Stop Market, Stop Limit, Take Profit Limit) */
  hideTpSl?: boolean;
}

/**
 * Hook for real-time order updates via WebSocket subscription
 * Replaces the old polling-based usePerpsOpenOrders hook
 *
 * Orders update instantly by default since they don't change frequently
 * and users expect immediate feedback when placing/cancelling orders.
 *
 * @param options - Configuration options for the hook
 * @returns Array of current orders with real-time updates
 */
export function usePerpsLiveOrders(
  options: UsePerpsLiveOrdersOptions = {},
): Order[] {
  const { throttleMs = 0, hideTpSl = false } = options; // No throttling by default for instant updates
  const stream = usePerpsStream();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsubscribe = stream.orders.subscribe({
      callback: (newOrders) => {
        if (!newOrders) {
          return;
        }
        setOrders(newOrders);
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, throttleMs]);

  // Filter out TP/SL orders if requested
  const filteredOrders = useMemo(() => {
    if (!hideTpSl) {
      return orders;
    }
    return orders.filter((order) => !isTPSLOrder(order.detailedOrderType));
  }, [orders, hideTpSl]);

  return filteredOrders;
}
