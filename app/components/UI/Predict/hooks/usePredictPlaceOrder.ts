import { useCallback, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { PlaceOrderParams, Side, type Result } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { strings } from '../../../../../locales/i18n';
import { formatPrice } from '../utils/format';
import { ensureError, parseErrorMessage } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';
import { usePredictBalance } from './usePredictBalance';
import { predictQueries } from '../queries';
import { usePredictDeposit } from './usePredictDeposit';
import { PredictEventValues } from '../constants/eventNames';

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
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  isOrderNotFilled: boolean;
  resetOrderNotFilled: () => void;
}

export type PlaceOrderOutcome =
  | {
      status: 'success';
      result: Result;
    }
  | {
      status: 'deposit_required';
    }
  | {
      status: 'order_not_filled';
    }
  | {
      status: 'error';
      error: string;
    };

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
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);
  const { toastRef } = useContext(ToastContext);
  const queryClient = useQueryClient();
  const { data: balance = 0 } = usePredictBalance();
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
    async (orderParams: PlaceOrderParams): Promise<PlaceOrderOutcome> => {
      const {
        preview: { minAmountReceived, side, maxAmountSpent },
      } = orderParams;

      // Check if user has sufficient balance for the bet amount
      // maxAmountSpent includes the bet amount plus all fees
      if (side === Side.BUY && balance < maxAmountSpent) {
        await deposit({
          amountUsd: maxAmountSpent,
          analyticsProperties: {
            ...orderParams.analyticsProperties,
            marketId: orderParams.preview.marketId,
            entryPoint: PredictEventValues.ENTRY_POINT.BUY_PREVIEW,
          },
        });
        return { status: 'deposit_required' };
      }

      try {
        setIsLoading(true);

        // Place order using Predict controller
        const orderResult = await controllerPlaceOrder(orderParams);

        // Clear any previous error state
        setError(undefined);

        onComplete?.(orderResult);

        setResult(orderResult);

        queryClient.invalidateQueries({
          queryKey: predictQueries.balance.keys.all(),
        });

        if (side === Side.BUY) {
          showOrderPlacedToast();
        } else {
          showCashedOutToast(
            formatPrice(minAmountReceived, { maximumDecimals: 2 }),
          );
        }

        DevLogger.log('usePredictPlaceOrder: Order placed successfully');
        return { status: 'success', result: orderResult };
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
              side: orderParams.preview?.side,
              marketId: orderParams.analyticsProperties?.marketId,
              transactionType: orderParams.analyticsProperties?.transactionType,
            },
          },
        });

        const rawMessage = err instanceof Error ? err.message : String(err);
        const isNotFilled =
          rawMessage === PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED ||
          rawMessage === PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED;

        if (isNotFilled) {
          setIsOrderNotFilled(true);
          return { status: 'order_not_filled' };
        }

        setError(parsedErrorMessage);
        onError?.(parsedErrorMessage);
        return { status: 'error', error: parsedErrorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [
      balance,
      deposit,
      controllerPlaceOrder,
      queryClient,
      onComplete,
      showOrderPlacedToast,
      showCashedOutToast,
      onError,
    ],
  );

  const resetOrderNotFilled = useCallback(() => {
    setIsOrderNotFilled(false);
    setError(undefined);
  }, []);

  return {
    error,
    isLoading,
    result,
    placeOrder,
    isOrderNotFilled,
    resetOrderNotFilled,
  };
}
