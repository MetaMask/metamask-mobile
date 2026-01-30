import { captureException } from '@sentry/react-native';
import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import type { OrderParams, OrderResult, Position } from '../controllers/types';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import { usePerpsTrading } from './usePerpsTrading';

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

  // Track order submission toast with unified measurement hook
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderSubmissionToast,
    op: TraceOperation.PerpsOrderSubmission,
    startConditions: [isPlacing], // Start when placing begins
    endConditions: [!!lastResult || !!error], // End when we have result or error
    resetConditions: [!isPlacing], // Reset when not placing
  });

  const placeOrder = useCallback(
    async (orderParams: OrderParams) => {
      try {
        setIsPlacing(true);
        setError(undefined);
        setLastResult(undefined);

        DevLogger.log(
          'usePerpsOrderExecution: Placing order',
          JSON.stringify(orderParams, null, 2),
        );

        const result = await controllerPlaceOrder(orderParams);
        setLastResult(result);

        if (result.success) {
          DevLogger.log(
            'usePerpsOrderExecution: Order placed successfully',
            result,
          );

          // Check if order was partially filled
          const orderSize = Number.parseFloat(orderParams.size.toString());
          const filledSize = result.filledSize
            ? Number.parseFloat(result.filledSize)
            : orderSize;
          const isPartiallyFilled = filledSize > 0 && filledSize < orderSize;

          if (isPartiallyFilled) {
            // Track partially filled event
            track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, {
              [PerpsEventProperties.STATUS]:
                PerpsEventValues.STATUS.PARTIALLY_FILLED,
              [PerpsEventProperties.ASSET]: orderParams.symbol,
              [PerpsEventProperties.DIRECTION]: orderParams.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.LEVERAGE]: orderParams.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: orderSize,
              [PerpsEventProperties.ORDER_TYPE]: orderParams.orderType,
              [PerpsEventProperties.AMOUNT_FILLED]: filledSize,
              [PerpsEventProperties.REMAINING_AMOUNT]: orderSize - filledSize,
            });
          }

          // Try to fetch the newly created position
          try {
            // Add a small delay to ensure the position is available
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const fetchedPositions = await getPositions();
            const newPosition = fetchedPositions.find(
              (p) => p.symbol === orderParams.symbol,
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
          track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, {
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: orderParams.symbol,
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

        // Capture exception with order context
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePerpsOrderExecution',
            action: 'order_creation',
            operation: 'order_management',
          },
          extra: {
            orderContext: {
              symbol: orderParams.symbol,
              isBuy: orderParams.isBuy,
              orderType: orderParams.orderType,
              size: orderParams.size,
              price: orderParams.price,
              leverage: orderParams.leverage,
              takeProfitPrice: orderParams.takeProfitPrice,
              stopLossPrice: orderParams.stopLossPrice,
            },
          },
        });

        // Track exception with specific event
        track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, {
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
          [PerpsEventProperties.ASSET]: orderParams.symbol,
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
