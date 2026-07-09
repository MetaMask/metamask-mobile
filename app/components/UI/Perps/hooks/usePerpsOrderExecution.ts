import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import {
  PERPS_CONSTANTS,
  type OrderParams,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import { usePerpsTrading } from './usePerpsTrading';

interface UsePerpsOrderExecutionParams {
  /** Called when the order has been successfully submitted to the exchange (before position fetch). */
  onSubmitted?: () => void;
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
 * Manages loading states, success/error handling, and position fetching.
 *
 * Trade transaction analytics (submitted + terminal) are emitted by
 * `@metamask/perps-controller` TradingService — do not re-emit
 * PERPS_TRADE_TRANSACTION from this hook.
 */
export function usePerpsOrderExecution(
  params: UsePerpsOrderExecutionParams = {},
): UsePerpsOrderExecutionReturn {
  const { onSubmitted, onSuccess, onError } = params;
  const { placeOrder: controllerPlaceOrder, getPositions } = usePerpsTrading();

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

        onSubmitted?.();

        const result = await controllerPlaceOrder(orderParams);
        setLastResult(result);

        if (result.success) {
          DevLogger.log(
            'usePerpsOrderExecution: Order placed successfully',
            result,
          );

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

          onError?.(errorMessage);
        }
      } catch (err) {
        const errorObject = ensureError(
          err,
          'usePerpsOrderExecution.placeOrder',
        );
        const errorMessage =
          err instanceof Error
            ? err.message
            : strings('perps.order.error.unknown');
        setError(errorMessage);
        DevLogger.log('usePerpsOrderExecution: Error placing order', err);

        Logger.error(errorObject, {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsOrderExecution',
            action: 'order_creation',
            operation: 'order_management',
          },
          context: {
            name: 'usePerpsOrderExecution',
            data: {
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

        onError?.(errorMessage);
      } finally {
        setIsPlacing(false);
      }
    },
    [controllerPlaceOrder, getPositions, onSubmitted, onSuccess, onError],
  );

  return {
    placeOrder,
    isPlacing,
    lastResult,
    error,
  };
}
