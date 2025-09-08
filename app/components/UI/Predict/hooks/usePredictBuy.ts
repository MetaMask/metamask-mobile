import { useCallback, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { BuyParams, Result } from '../types';
import { usePredictTrading } from './usePredictTrading';

interface UsePredictBuyOptions {
  /**
   * Callback when order is placed successfully
   */
  onSuccess?: (result: Result) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

interface UsePredictBuyReturn {
  isPlacing: boolean;
  error: string | null;
  lastResult: Result | null;
  currentOrder: BuyParams | null;
  placeBuyOrder: (params: BuyParams) => Promise<void>;
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
  const [currentOrder, setCurrentOrder] = useState<BuyParams | null>(null);
  const [lastResult, setLastResult] = useState<Result | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLastResult(null);
    setIsPlacing(false);
    setCurrentOrder(null);
  }, []);

  const placeBuyOrder = useCallback(
    async (orderParams: BuyParams) => {
      reset();
      try {
        setIsPlacing(true);
        setError(null);

        const { amount, marketId, outcomeId, outcomeTokenId, providerId } =
          orderParams;

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        setCurrentOrder(orderParams);

        // Place order using Predict controller
        const result = await buy({
          amount,
          marketId,
          outcomeId,
          outcomeTokenId,
          providerId,
        });

        setLastResult(result);

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');

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
