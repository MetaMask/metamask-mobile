import { useCallback, useState, useMemo } from 'react';
import type {
  OrderParams,
  OrderResult,
  CancelOrderParams,
  CancelOrderResult,
} from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

/**
 * Hook for managing multiple orders with loading states
 */
export function usePerpsOrderManagement() {
  const { placeOrder, cancelOrder } = usePerpsTrading();
  const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});

  const addPendingOrder = useCallback((id: string) => {
    setPendingOrders(prev => new Set(prev).add(id));
  }, []);

  const removePendingOrder = useCallback((id: string) => {
    setPendingOrders(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setOrderError = useCallback((id: string, error: string) => {
    setOrderErrors(prev => ({ ...prev, [id]: error }));
  }, []);

  const placeOrderWithState = useCallback(async (params: OrderParams, orderId?: string): Promise<OrderResult> => {
    const id = orderId || `${params.coin}_${Date.now()}`;

    addPendingOrder(id);
    setOrderError(id, '');

    try {
      const result = await placeOrder(params);
      removePendingOrder(id);

      if (!result.success) {
        setOrderError(id, result.error || 'Order failed');
      }

      return result;
    } catch (error) {
      removePendingOrder(id);
      setOrderError(id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [placeOrder, addPendingOrder, removePendingOrder, setOrderError]);

  const cancelOrderWithState = useCallback(async (params: CancelOrderParams): Promise<CancelOrderResult> => {
    const id = `cancel_${params.orderId}`;

    addPendingOrder(id);

    try {
      const result = await cancelOrder(params);
      removePendingOrder(id);
      return result;
    } catch (error) {
      removePendingOrder(id);
      throw error;
    }
  }, [cancelOrder, addPendingOrder, removePendingOrder]);

  const clearOrderError = useCallback((orderId: string) => {
    setOrderError(orderId, '');
  }, [setOrderError]);

  return useMemo(() => ({
    placeOrder: placeOrderWithState,
    cancelOrder: cancelOrderWithState,
    pendingOrders,
    orderErrors,
    clearOrderError,
  }), [placeOrderWithState, cancelOrderWithState, pendingOrders, orderErrors, clearOrderError]);
}
