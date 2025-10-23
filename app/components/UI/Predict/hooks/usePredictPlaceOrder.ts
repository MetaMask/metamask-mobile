import { useCallback, useContext, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PlaceOrderParams } from '../providers/types';
import { Side, type Result } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { strings } from '../../../../../locales/i18n';
import { formatPrice } from '../utils/format';
import { usePredictBalance } from './usePredictBalance';

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
  const { loadBalance } = usePredictBalance();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result | null>(null);
  const { toastRef } = useContext(ToastContext);

  const showCashedOutToast = useCallback(
    (amount: string) => {
      // NOTE: When cashing out happens fast, stacking toasts messes the UX.
      // Figure out how toast behavior can be improved to avoid this.
      setTimeout(() => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Check,
          labelOptions: [
            { label: strings('predict.order.cashed_out'), isBold: true },
            { label: '\n', isBold: false },
            {
              label: strings('predict.order.cashed_out_subtitle', {
                amount,
              }),
              isBold: false,
            },
          ],
          hasNoTimeout: false,
        });
      }, 2000);
    },
    [toastRef],
  );

  const showOrderPlacedToast = useCallback(
    () =>
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Check,
        labelOptions: [
          { label: strings('predict.order.prediction_placed'), isBold: true },
        ],
        hasNoTimeout: false,
      }),
    [toastRef],
  );

  const placeOrder = useCallback(
    async (orderParams: PlaceOrderParams) => {
      const {
        preview: { minAmountReceived, side },
      } = orderParams;

      try {
        setIsLoading(true);

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);
        if (side === Side.BUY) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            labelOptions: [
              { label: strings('predict.order.placing_prediction') },
            ],
            hasNoTimeout: false,
          });
        } else {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            labelOptions: [
              {
                label: strings('predict.order.cashing_out', {
                  amount: formatPrice(minAmountReceived, {
                    maximumDecimals: 2,
                  }),
                }),
                isBold: true,
              },
              { label: '\n', isBold: false },
              {
                label: strings('predict.order.cashing_out_subtitle', {
                  time: 5,
                }),
                isBold: false,
              },
            ],
            hasNoTimeout: false,
          });
        }

        // Place order using Predict controller
        const orderResult = await controllerPlaceOrder(orderParams);

        if (!orderResult.success) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            labelOptions: [{ label: strings('predict.order.order_failed') }],
            hasNoTimeout: false,
          });
          throw new Error(orderResult.error);
        }

        // Clear any previous error state
        setError(undefined);

        onComplete?.(orderResult);

        setResult(orderResult);

        if (side === Side.BUY) {
          showOrderPlacedToast();
        } else {
          showCashedOutToast(
            formatPrice(minAmountReceived, { maximumDecimals: 2 }),
          );
        }

        await loadBalance({ isRefresh: true });

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
    [
      controllerPlaceOrder,
      onComplete,
      loadBalance,
      toastRef,
      showCashedOutToast,
      showOrderPlacedToast,
      onError,
    ],
  );

  return {
    error,
    isLoading,
    result,
    placeOrder,
  };
}
