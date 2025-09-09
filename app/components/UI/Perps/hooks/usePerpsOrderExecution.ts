import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderParams, OrderResult, Position } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import performance from 'react-native-performance';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import { setMeasurement } from '@sentry/react-native';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { usePerpsEventTracking } from './usePerpsEventTracking';

interface UsePerpsOrderExecutionParams {
  onSuccess?: (position?: Position) => void;
  onError?: (error: string) => void;
}

interface UsePerpsOrderExecutionReturn {
  placeOrder: (params: OrderParams) => Promise<void>;
  isPlacing: boolean;
  lastResult?: OrderResult;
  error?: string;
}

/**
 * Hook to handle order execution flow
 * Manages loading states, success/error handling, and position fetching
 */
export function usePerpsOrderExecution(
  params: UsePerpsOrderExecutionParams = {},
): UsePerpsOrderExecutionReturn {
  const { onSuccess, onError } = params;
  const { placeOrder: controllerPlaceOrder, getPositions } = usePerpsTrading();
  const { track } = usePerpsEventTracking();

  const [isPlacing, setIsPlacing] = useState(false);
  const [lastResult, setLastResult] = useState<OrderResult>();
  const [error, setError] = useState<string>();

  const placeOrder = useCallback(
    async (orderParams: OrderParams) => {
      try {
        setIsPlacing(true);
        setError(undefined);

        DevLogger.log(
          'usePerpsOrderExecution: Placing order',
          JSON.stringify(orderParams, null, 2),
        );

        // Track order submission toast timing
        const orderSubmissionStart = performance.now();

        const result = await controllerPlaceOrder(orderParams);
        setLastResult(result);

        // Measure order submission toast loaded
        const submissionDuration = performance.now() - orderSubmissionStart;
        setMeasurement(
          PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
          submissionDuration,
          'millisecond',
        );

        if (result.success) {
          DevLogger.log(
            'usePerpsOrderExecution: Order placed successfully',
            result,
          );

          // Check if order was partially filled
          const orderSize = parseFloat(orderParams.size.toString());
          const filledSize = result.filledSize
            ? parseFloat(result.filledSize)
            : orderSize;
          const isPartiallyFilled = filledSize > 0 && filledSize < orderSize;

          if (isPartiallyFilled) {
            // Track partially filled event
            track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_PARTIALLY_FILLED, {
              [PerpsEventProperties.ASSET]: orderParams.coin,
              [PerpsEventProperties.DIRECTION]: orderParams.isBuy
                ? 'Long'
                : 'Short',
              [PerpsEventProperties.LEVERAGE]: orderParams.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: orderSize,
              [PerpsEventProperties.ORDER_TYPE]: orderParams.orderType,
              [PerpsEventProperties.AMOUNT_FILLED]: filledSize,
              [PerpsEventProperties.REMAINING_AMOUNT]: orderSize - filledSize,
            });
          }

          // Track order confirmation timing
          const orderConfirmationStart = performance.now();

          // Try to fetch the newly created position
          try {
            // Add a small delay to ensure the position is available
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const fetchedPositions = await getPositions();
            const newPosition = fetchedPositions.find(
              (p) => p.coin === orderParams.coin,
            );

            // Measure order confirmation toast loaded
            const confirmationDuration =
              performance.now() - orderConfirmationStart;
            setMeasurement(
              PerpsMeasurementName.ORDER_CONFIRMATION_TOAST_LOADED,
              confirmationDuration,
              'millisecond',
            );

            if (newPosition) {
              DevLogger.log(
                'usePerpsOrderExecution: Found new position',
                newPosition,
              );
              onSuccess?.(newPosition);
            } else {
              DevLogger.log(
                'usePerpsOrderExecution: Position not found immediately',
              );
              // Still call success, but without position data
              onSuccess?.();
            }
          } catch (fetchError) {
            DevLogger.log(
              'usePerpsOrderExecution: Error fetching positions after order',
              fetchError,
            );
            // Don't fail the whole operation, just proceed without position data
            onSuccess?.();
          }
        } else {
          const errorMessage =
            result.error || strings('perps.order.error.unknown');
          setError(errorMessage);
          DevLogger.log('usePerpsOrderExecution: Order failed', errorMessage);

          // Track order failure with specific event
          track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_FAILED, {
            [PerpsEventProperties.ASSET]: orderParams.coin,
            [PerpsEventProperties.DIRECTION]: orderParams.isBuy
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: orderParams.orderType,
            [PerpsEventProperties.ORDER_SIZE]: orderParams.size,
            [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
          });

          onError?.(errorMessage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : strings('perps.order.error.unknown');
        setError(errorMessage);
        DevLogger.log('usePerpsOrderExecution: Error placing order', err);

        // Track exception with specific event
        track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_FAILED, {
          [PerpsEventProperties.ASSET]: orderParams.coin,
          [PerpsEventProperties.DIRECTION]: orderParams.isBuy
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_TYPE]: orderParams.orderType,
          [PerpsEventProperties.ORDER_SIZE]: orderParams.size,
          [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
        });

        onError?.(errorMessage);
      } finally {
        setIsPlacing(false);
      }
    },
    [controllerPlaceOrder, getPositions, onSuccess, onError, track],
  );

  return {
    placeOrder,
    isPlacing,
    lastResult,
    error,
  };
}
