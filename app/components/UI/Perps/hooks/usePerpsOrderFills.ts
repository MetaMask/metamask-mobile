import { useCallback, useEffect, useState } from 'react';
import type { OrderFill } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

/**
 * Hook for live order fill notifications
 */
export function usePerpsOrderFills(maxFills: number = 100): OrderFill[] {
  const { subscribeToOrderFills } = usePerpsTrading();
  const [orderFills, setOrderFills] = useState<OrderFill[]>([]);

  const memoizedCallback = useCallback((fills: OrderFill[]) => {
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
