import { captureException } from '@sentry/react-native';
import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
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
              [PERPS_EVENT_PROPERTY.STATUS]:
                PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
              [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
              [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
                ? PERPS_EVENT_VALUE.DIRECTION.LONG
                : PERPS_EVENT_VALUE.DIRECTION.SHORT,
              [PERPS_EVENT_PROPERTY.LEVERAGE]: orderParams.leverage || 1,
              [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderSize,
              [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
              [PERPS_EVENT_PROPERTY.AMOUNT_FILLED]: filledSize,
              [PERPS_EVENT_PROPERTY.REMAINING_AMOUNT]: orderSize - filledSize,
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
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
            [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
            [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
            [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderParams.size,
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
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
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
          [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
            ? PERPS_EVENT_VALUE.DIRECTION.LONG
            : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
          [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderParams.size,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
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
