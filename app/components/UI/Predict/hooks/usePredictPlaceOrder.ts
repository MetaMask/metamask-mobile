import { useCallback, useContext, useState } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { useMetrics } from '../../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { PlaceOrderParams } from '../providers/types';
import type { Result } from '../types';
import { OrderResponse } from '../providers/polymarket/types';
import { usePredictTrading } from './usePredictTrading';
import {
  PredictEventProperties,
  PredictEventValues,
} from '../constants/eventNames';

interface PredictAnalyticsProperties {
  marketId?: string;
  marketTitle?: string;
  marketCategory?: string;
  entryPoint?: string;
  transactionType?:
    | typeof PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY
    | typeof PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_SELL;
  liquidity?: number;
  sharePrice?: number;
}

interface UsePredictPlaceOrderOptions {
  /**
   * Callback when order is completed
   */
  onComplete?: (result: Result) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
  /**
   * Analytics properties for tracking
   */
  analyticsProperties?: PredictAnalyticsProperties;
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
  const { onError, onComplete, analyticsProperties } = options;
  const { placeOrder: controllerPlaceOrder } = usePredictTrading();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result | null>(null);
  const { toastRef } = useContext(ToastContext);

  const placeOrder = useCallback(
    async (orderParams: PlaceOrderParams) => {
      try {
        setIsLoading(true);

        DevLogger.log('usePredictPlaceOrder: Placing order', orderParams);

        // Track Predict Action Submitted
        if (analyticsProperties) {
          const regularProperties = {
            [PredictEventProperties.TIMESTAMP]: Date.now(),
            [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
            [PredictEventProperties.MARKET_TITLE]:
              analyticsProperties.marketTitle,
            [PredictEventProperties.MARKET_CATEGORY]:
              analyticsProperties.marketCategory,
            [PredictEventProperties.ENTRY_POINT]:
              analyticsProperties.entryPoint,
            [PredictEventProperties.TRANSACTION_TYPE]:
              analyticsProperties.transactionType,
            [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
          };

          const sensitiveProperties = {
            [PredictEventProperties.AMOUNT]: orderParams?.size,
            [PredictEventProperties.SHARE_PRICE]:
              analyticsProperties.sharePrice,
          };

          // eslint-disable-next-line no-console
          console.log('📊 [Analytics] PREDICT_ACTION_SUBMITTED', {
            regularProperties,
            sensitiveProperties,
          });

          trackEvent(
            createEventBuilder(MetaMetricsEvents.PREDICT_ACTION_SUBMITTED)
              .addProperties(regularProperties)
              .addSensitiveProperties(sensitiveProperties)
              .build(),
          );
        }

        // Place order using Predict controller
        const orderResult = await controllerPlaceOrder(orderParams);

        if (!orderResult.success) {
          const failureReason = orderResult.error || 'Unknown error';

          // Track Predict Action Failed
          if (analyticsProperties) {
            const regularProperties = {
              [PredictEventProperties.TIMESTAMP]: Date.now(),
              [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
              [PredictEventProperties.MARKET_TITLE]:
                analyticsProperties.marketTitle,
              [PredictEventProperties.MARKET_CATEGORY]:
                analyticsProperties.marketCategory,
              [PredictEventProperties.ENTRY_POINT]:
                analyticsProperties.entryPoint,
              [PredictEventProperties.TRANSACTION_TYPE]:
                analyticsProperties.transactionType,
              [PredictEventProperties.FAILURE_REASON]: failureReason,
            };

            const sensitiveProperties = {
              [PredictEventProperties.AMOUNT]: orderParams?.size,
              [PredictEventProperties.SHARE_PRICE]:
                analyticsProperties.sharePrice,
            };

            // eslint-disable-next-line no-console
            console.log('📊 [Analytics] PREDICT_ACTION_FAILED', {
              regularProperties,
              sensitiveProperties,
            });

            trackEvent(
              createEventBuilder(MetaMetricsEvents.PREDICT_ACTION_FAILED)
                .addProperties(regularProperties)
                .addSensitiveProperties(sensitiveProperties)
                .build(),
            );
          }

          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            labelOptions: [{ label: 'Order failed' }],
            hasNoTimeout: false,
          });
          throw new Error(failureReason);
        }

        // Clear any previous error state
        setError(undefined);

        onComplete?.(orderResult as Result);

        setResult(orderResult as Result);

        // Track Predict Action Completed
        if (analyticsProperties) {
          // Extract order ID from response if available
          const orderIdFromResponse =
            orderResult.response &&
            typeof orderResult.response === 'object' &&
            'orderID' in orderResult.response
              ? (orderResult.response as OrderResponse).orderID
              : undefined;

          const regularProperties = {
            [PredictEventProperties.TIMESTAMP]: Date.now(),
            [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
            [PredictEventProperties.MARKET_TITLE]:
              analyticsProperties.marketTitle,
            [PredictEventProperties.MARKET_CATEGORY]:
              analyticsProperties.marketCategory,
            [PredictEventProperties.ENTRY_POINT]:
              analyticsProperties.entryPoint,
            [PredictEventProperties.TRANSACTION_TYPE]:
              analyticsProperties.transactionType,
            [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
          };

          const sensitiveProperties = {
            [PredictEventProperties.AMOUNT]: orderParams?.size,
            [PredictEventProperties.SHARE_PRICE]:
              analyticsProperties.sharePrice,
            [PredictEventProperties.ORDER_ID]: orderIdFromResponse,
          };

          // eslint-disable-next-line no-console
          console.log('📊 [Analytics] PREDICT_ACTION_COMPLETED', {
            regularProperties,
            sensitiveProperties,
          });

          trackEvent(
            createEventBuilder(MetaMetricsEvents.PREDICT_ACTION_COMPLETED)
              .addProperties(regularProperties)
              .addSensitiveProperties(sensitiveProperties)
              .build(),
          );
        }

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
    [
      toastRef,
      controllerPlaceOrder,
      onComplete,
      onError,
      analyticsProperties,
      trackEvent,
      createEventBuilder,
    ],
  );

  return {
    error,
    isLoading,
    result,
    placeOrder,
  };
}
