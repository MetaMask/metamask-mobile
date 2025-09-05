import { useCallback, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { BuyOrderParams, PlaceOrderResult } from '../types';
import { usePredictTrading } from './usePredictTrading';

interface UsePredictBuyOptions {
  /**
   * Callback when order is placed successfully
   */
  onSuccess?: (result: PlaceOrderResult) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

interface UsePredictBuyReturn {
  isPlacing: boolean;
  error: string | null;
  lastResult: PlaceOrderResult | null;
  currentOrder: BuyOrderParams | null;
  placeBuyOrder: (params: {
    marketId: string;
    outcomeId: string;
    amount: number;
  }) => Promise<void>;
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
  const { onSuccess, onError } = options;
  const { buy } = usePredictTrading();

  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<BuyOrderParams | null>(null);
  const [lastResult, setLastResult] = useState<PlaceOrderResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLastResult(null);
    setIsPlacing(false);
    setCurrentOrder(null);
  }, []);

  const placeBuyOrder = useCallback(
    async (orderParams: {
      marketId: string;
      outcomeId: string;
      amount: number;
    }) => {
      reset();
      try {
        setIsPlacing(true);
        setError(null);

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        setCurrentOrder(orderParams);

        // Place order using Predict controller
        const result = await buy({ orderParams });

        setLastResult(result);

        DevLogger.log('usePredictPlaceOrder: Order placed successfully', {
          providerId: result.providerId,
          txMeta: result.txMeta,
        });

        onSuccess?.(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place order';
        setError(errorMessage);
        DevLogger.log('usePredictPlaceOrder: Error placing order', {
          error: err,
          orderParams,
        });

        onError?.(errorMessage);
      } finally {
        setIsPlacing(false);
      }
    },
    [reset, buy, onSuccess, onError],
  );

  return {
    isPlacing,
    error,
    lastResult,
    currentOrder,
    placeBuyOrder,
    reset,
  };
}
