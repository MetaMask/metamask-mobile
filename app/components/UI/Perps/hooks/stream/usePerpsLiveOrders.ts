import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { Order } from '../../controllers/types';

export interface UsePerpsLiveOrdersOptions {
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
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
  const { throttleMs = 0 } = options; // No throttling by default for instant updates
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

  return orders;
}
