import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderParams, OrderResult, Position } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

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
              (p) => p.coin === orderParams.coin,
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
        const errorMessage =
          err instanceof Error
            ? err.message
            : strings('perps.order.error.unknown');
        setError(errorMessage);
        DevLogger.log('usePerpsOrderExecution: Error placing order', err);
        onError?.(errorMessage);
      } finally {
        setIsPlacing(false);
      }
    },
    [controllerPlaceOrder, getPositions, onSuccess, onError],
  );

  return {
    placeOrder,
    isPlacing,
    lastResult,
    error,
  };
}
