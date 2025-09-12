import { useCallback, useEffect, useMemo, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { BuyParams, PredictOrder, Result } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';

interface UsePredictBuyOptions {
  /**
   * Callback when order is placed successfully
   */
  onBuyPlaced?: (order: PredictOrder) => void;
  /**
   * Callback when order is completed
   */
  onComplete?: (order: PredictOrder) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string, order: PredictOrder | null) => void;
}

interface UsePredictBuyReturn {
  error?: string;
  loading: boolean;
  result: Result | null;
  currentOrder: PredictOrder | null;
  completed: boolean;
  placeBuyOrder: (params: BuyParams) => Promise<void>;
  isOrderLoading: (outcomeTokenId: string) => boolean;
  reset: () => void;
}

/**
 * Hook for placing Predict orders with loading states and error handling
 * @param options Configuration options for the hook
 * @returns Order placement utilities and state
 */
export function usePredictBuy(
  options: UsePredictBuyOptions = {},
): UsePredictBuyReturn {
  const { onBuyPlaced, onError, onComplete } = options;
  const { buy } = usePredictTrading();

  const [currentOrderParams, setCurrentOrderParams] =
    useState<BuyParams | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const selectActiveOrdersState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.activeOrders,
  );

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

  const error = useMemo(
    () => result?.error ?? currentOrder?.error,
    [currentOrder, result],
  );

  const loading = useMemo(
    () => isPlacing && !completed && !error,
    [isPlacing, completed, error],
  );

  useEffect(() => {
    if (completed && currentOrder) {
      onComplete?.(currentOrder);
    }
  }, [completed, currentOrder, onComplete]);

  useEffect(() => {
    if (result?.id) {
      const activeOrder = activeOrders[result.id];
      onBuyPlaced?.(activeOrder);
    }
  }, [activeOrders, onBuyPlaced, result]);

  useEffect(() => {
    if (error) {
      onError?.(error, currentOrder);
    }
  }, [error, onError, currentOrder]);

  const reset = useCallback(() => {
    setResult(null);
    setIsPlacing(false);
    setCurrentOrderParams(null);
  }, []);

  const isOrderLoading = useCallback(
    (outcomeTokenId: string) =>
      currentOrderParams?.outcomeTokenId === outcomeTokenId && loading,
    [currentOrderParams, loading],
  );

  const placeBuyOrder = useCallback(
    async (orderParams: BuyParams) => {
      reset();
      try {
        setIsPlacing(true);
        setCurrentOrderParams(orderParams);
        const { amount, outcomeId, outcomeTokenId, market } = orderParams;

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        // Place order using Predict controller
        const buyResult = await buy({
          amount,
          market,
          outcomeId,
          outcomeTokenId,
        });

        setResult(buyResult);

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place order';
        DevLogger.log('usePredictPlaceOrder: Error placing order', {
          error: err,
          orderParams,
        });

        onError?.(errorMessage, currentOrder);
      }
    },
    [reset, buy, onError, currentOrder],
  );

  return {
    error,
    loading,
    result,
    currentOrder,
    completed,
    isOrderLoading,
    placeBuyOrder,
    reset,
  };
}
