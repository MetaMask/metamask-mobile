import { useCallback, useState } from 'react';
import type {
  OrderParams,
  OrderResult,
  CancelOrderParams,
  CancelOrderResult,
} from '../controllers/types';
import { usePerpsController } from './usePerpsController';

/**
 * Hook for managing multiple orders with loading states
 */
export function useOrderManagement() {
  const { placeOrder, cancelOrder } = usePerpsController();
  const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});

  const placeOrderWithState = useCallback(async (params: OrderParams, orderId?: string): Promise<OrderResult> => {
    const id = orderId || `${params.coin}_${Date.now()}`;

    setPendingOrders(prev => new Set(prev).add(id));
    setOrderErrors(prev => ({ ...prev, [id]: '' }));

    try {
      const result = await placeOrder(params);
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (!result.success) {
        setOrderErrors(prev => ({ ...prev, [id]: result.error || 'Order failed' }));
      }

      return result;
    } catch (error) {
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOrderErrors(prev => ({
        ...prev,
        [id]: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  }, [placeOrder]);

  const cancelOrderWithState = useCallback(async (params: CancelOrderParams): Promise<CancelOrderResult> => {
    const id = `cancel_${params.orderId}`;

    setPendingOrders(prev => new Set(prev).add(id));

    try {
      const result = await cancelOrder(params);
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      return result;
    } catch (error) {
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [cancelOrder]);

  const clearOrderError = useCallback((orderId: string) => {
    setOrderErrors(prev => ({ ...prev, [orderId]: '' }));
  }, []);

  return {
    placeOrder: placeOrderWithState,
    cancelOrder: cancelOrderWithState,
    pendingOrders,
    orderErrors,
    clearOrderError,
  };
}
