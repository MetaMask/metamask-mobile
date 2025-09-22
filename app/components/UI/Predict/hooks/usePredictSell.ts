import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { RootState } from '../../../../reducers';
import type { PredictOrder, Result, SellParams } from '../types';
import { usePredictTrading } from './usePredictTrading';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';

interface UsePredictSellOptions {
  /**
   * Callback when order is completed
   */
  onComplete?: (order: PredictOrder) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string, order: PredictOrder | null) => void;
}

interface UsePredictSellReturn {
  error?: string;
  loading: boolean;
  result: Result | null;
  currentOrder: PredictOrder | null;
  completed: boolean;
  currentOrderParams: SellParams | null;
  placeSellOrder: (params: SellParams) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for placing Predict sell orders with loading states and error handling
 * @param options Configuration options for the hook
 * @returns Order placement utilities and state
 */
export function usePredictSell(
  options: UsePredictSellOptions = {},
): UsePredictSellReturn {
  const { onError, onComplete } = options;
  const { sell } = usePredictTrading();

  const [currentOrderParams, setCurrentOrderParams] =
    useState<SellParams | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const selectActiveOrdersState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.activeOrders,
  );

  const { toastRef } = useContext(ToastContext);

  const activeOrders = useSelector(selectActiveOrdersState);
  const currentOrder = useMemo(() => {
    if (!result?.id) {
      return null;
    }
    return activeOrders[result.id];
  }, [activeOrders, result?.id]);

  const completed = useMemo(() => {
    if (!currentOrder) {
      return false;
    }

    return currentOrder.status === 'filled';
  }, [currentOrder]);

  const error = useMemo(() => {
    // Prioritize result error first
    if (result?.error) {
      return result.error;
    }

    // Then check order error
    if (currentOrder?.error) {
      return currentOrder.error;
    }

    // Finally check if order was cancelled
    if (currentOrder?.status === 'cancelled') {
      return 'Order cancelled';
    }

    return undefined;
  }, [currentOrder, result]);

  const loading = useMemo(
    () => isPlacing && !completed && !error,
    [isPlacing, completed, error],
  );

  const reset = useCallback(() => {
    setResult(null);
    setIsPlacing(false);
    setCurrentOrderParams(null);
  }, []);

  useEffect(() => {
    if (completed && currentOrder) {
      onComplete?.(currentOrder);
    }
  }, [completed, currentOrder, onComplete]);

  useEffect(() => {
    if (error) {
      onError?.(error, currentOrder);
    }
  }, [error, onError, currentOrder]);

  const placeSellOrder = useCallback(
    async (orderParams: SellParams) => {
      reset();
      try {
        setIsPlacing(true);
        setCurrentOrderParams(orderParams);
        const { position } = orderParams;

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          labelOptions: [{ label: 'Order placed' }],
          hasNoTimeout: false,
        });

        // Place order using Predict controller
        const sellResult = await sell({
          position,
        });

        setResult(sellResult);

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place order';
        DevLogger.log('usePredictPlaceOrder: Error placing order', {
          error: err,
          orderParams,
        });

        onError?.(errorMessage, currentOrder);
      } finally {
        setIsPlacing(false);
      }
    },
    [reset, toastRef, sell, onError, currentOrder],
  );

  return {
    error,
    loading,
    result,
    currentOrder,
    completed,
    currentOrderParams,
    placeSellOrder,
    reset,
  };
}
