import { useCallback, useContext, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { PlaceOrderParams } from '../providers/types';
import { Side, type Result } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { strings } from '../../../../../locales/i18n';
import { formatPrice } from '../utils/format';
import { ensureError, parseErrorMessage } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';
import { usePredictBalance } from './usePredictBalance';
import { usePredictDeposit } from './usePredictDeposit';

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
  const { balance } = usePredictBalance({ loadOnMount: true });
  const { deposit } = usePredictDeposit();

  const showCashedOutToast = useCallback(
    (amount: string) => {
      // Track cashout confirmation toast display performance
      const traceId = `cashout-toast-${Date.now()}`;
      trace({
        name: TraceName.PredictCashoutConfirmationToast,
        op: TraceOperation.PredictOperation,
        id: traceId,
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
        },
      });

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

      // End trace immediately after toast is shown
      endTrace({
        name: TraceName.PredictCashoutConfirmationToast,
        id: traceId,
        data: { success: true },
      });
    },
    [toastRef],
  );

  const showOrderPlacedToast = useCallback(() => {
    // Track order confirmation toast display performance
    const traceId = `order-toast-${Date.now()}`;
    trace({
      name: TraceName.PredictOrderConfirmationToast,
      op: TraceOperation.PredictOperation,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
      },
    });

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      labelOptions: [
        { label: strings('predict.order.prediction_placed'), isBold: true },
      ],
      hasNoTimeout: false,
    });

    // End trace immediately after toast is shown
    endTrace({
      name: TraceName.PredictOrderConfirmationToast,
      id: traceId,
      data: { success: true },
    });
  }, [toastRef]);

  const placeOrder = useCallback(
    async (orderParams: PlaceOrderParams) => {
      const {
        preview: { minAmountReceived, side, maxAmountSpent },
      } = orderParams;

      // Check if user has sufficient balance for the bet amount
      // maxAmountSpent includes the bet amount plus all fees
      if (side === Side.BUY && balance < maxAmountSpent) {
        await deposit();
        return;
      }

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

        // Log error with order context (no sensitive data like amounts)
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictPlaceOrder',
          },
          context: {
            name: 'usePredictPlaceOrder',
            data: {
              method: 'placeOrder',
              action: 'order_placement',
              operation: 'order_management',
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
      balance,
      deposit,
      controllerPlaceOrder,
      onComplete,
      showOrderPlacedToast,
      showCashedOutToast,
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
