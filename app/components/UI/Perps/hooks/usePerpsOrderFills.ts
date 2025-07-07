import { useCallback, useEffect, useState } from 'react';
import type { OrderFill } from '../controllers/types';
import { usePerpsController } from './usePerpsController';

/**
 * Hook for live order fill notifications
 * Provides immediate feedback when orders are executed
 */
export function usePerpsOrderFills(maxFills: number = 100): OrderFill[] {
  const { subscribeToOrderFills } = usePerpsController();
  const [orderFills, setOrderFills] = useState<OrderFill[]>([]);

  const memoizedCallback = useCallback((fills: OrderFill[]) => {
    // Append new fills and keep only the latest maxFills to prevent memory leaks
    setOrderFills(prev => {
      const updated = [...prev, ...fills];
      return updated.slice(-maxFills);
    });
  }, [maxFills]);

  useEffect(() => {
    const unsubscribe = subscribeToOrderFills({
      callback: memoizedCallback,
    });

    return unsubscribe;
  }, [subscribeToOrderFills, memoizedCallback]);

  return orderFills;
}
