import { useCallback, useContext, useState } from 'react';
import { captureException } from '@sentry/react-native';
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
import { parseErrorMessage } from '../utils/predictErrorHandler';
import { PREDICT_ERROR_CODES } from '../constants/errors';

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

  const showCashedOutToast = useCallback(
    (amount: string) => {
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
        // Place order using Predict controller
        const orderResult = await controllerPlaceOrder(orderParams);

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

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');
      } catch (err) {
        const parsedErrorMessage = parseErrorMessage({
          error: err,
          defaultCode: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
        });
        DevLogger.log('usePredictPlaceOrder: Error placing order', {
          error: parsedErrorMessage,
          orderParams,
        });

        // Capture exception with order context (no sensitive data like amounts)
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePredictPlaceOrder',
            action: 'order_placement',
            operation: 'order_management',
          },
          extra: {
            orderContext: {
              providerId: orderParams.providerId,
              side: orderParams.preview?.side,
              marketId: orderParams.analyticsProperties?.marketId,
              transactionType: orderParams.analyticsProperties?.transactionType,
            },
          },
        });

        setError(parsedErrorMessage);
        onError?.(parsedErrorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      controllerPlaceOrder,
      onComplete,
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
