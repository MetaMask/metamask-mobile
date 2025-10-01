import { useCallback, useContext, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PlaceOrderParams } from '../providers/types';
import type { Result } from '../types';
import { usePredictTrading } from './usePredictTrading';

interface UsePredictPlaceOrderOptions {
  /**
   * Callback when order is completed
   */
  onComplete?: (result: Result) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

interface UsePredictPlaceOrderReturn {
  error?: string;
  isLoading: boolean;
  result: Result | null;
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
}

/**
 * Hook for placing Predict orders with loading states and error handling
 * @param options Configuration options for the hook
 * @returns Order placement utilities and state
 */
export function usePredictPlaceOrder(
  options: UsePredictPlaceOrderOptions = {},
): UsePredictPlaceOrderReturn {
  const { onError, onComplete } = options;
  const { placeOrder: controllerPlaceOrder } = usePredictTrading();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result | null>(null);
  const { toastRef } = useContext(ToastContext);

  const placeOrder = useCallback(
    async (orderParams: PlaceOrderParams) => {
      try {
        setIsLoading(true);

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        // Place order using Predict controller
        const orderResult = await controllerPlaceOrder(orderParams);

        if (!orderResult.success) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            labelOptions: [{ label: 'Order failed' }],
            hasNoTimeout: false,
          });
          throw new Error(orderResult.error);
        }

        // Clear any previous error state
        setError(undefined);

        onComplete?.(orderResult as Result);

        setResult(orderResult as Result);

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Check,
          labelOptions: [{ label: 'Order placed' }],
          hasNoTimeout: false,
        });

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place order';
        DevLogger.log('usePredictPlaceOrder: Error placing order', {
          error: err,
          orderParams,
        });

        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [toastRef, controllerPlaceOrder, onComplete, onError],
  );

  return {
    error,
    isLoading,
    result,
    placeOrder,
  };
}
