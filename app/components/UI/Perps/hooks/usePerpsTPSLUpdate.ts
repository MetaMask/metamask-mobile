import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import type { Position } from '../controllers/types';
import { captureException } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';

interface UseTPSLUpdateOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for handling TP/SL updates with consistent toast notifications
 * @param options Optional callbacks for success and error cases
 * @returns handleUpdateTPSL function and loading state
 */
export function usePerpsTPSLUpdate(options?: UseTPSLUpdateOptions) {
  const { updatePositionTPSL } = usePerpsTrading();
  const [isUpdating, setIsUpdating] = useState(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleUpdateTPSL = useCallback(
    async (
      position: Position,
      takeProfitPrice: string | undefined,
      stopLossPrice: string | undefined,
    ) => {
      setIsUpdating(true);
      DevLogger.log('usePerpsTPSLUpdate: Setting isUpdating to true');

      try {
        const result = await updatePositionTPSL({
          coin: position.coin,
          takeProfitPrice,
          stopLossPrice,
        });

        if (result.success) {
          DevLogger.log('Position TP/SL updated successfully:', result);

          showToast(
            PerpsToastOptions.positionManagement.tpsl.updateTPSLSuccess,
          );

          // Call success callback if provided
          options?.onSuccess?.();
        } else {
          DevLogger.log('Failed to update position TP/SL:', result.error);

          showToast(
            PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
              result.error,
            ),
          );

          // Call error callback if provided
          options?.onError?.(result.error || strings('perps.errors.unknown'));
        }
      } catch (error) {
        DevLogger.log('Error updating position TP/SL:', error);

        // Capture exception with position context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: {
              component: 'usePerpsTPSLUpdate',
              action: 'position_tpsl_update',
              operation: 'position_management',
            },
            extra: {
              positionContext: {
                coin: position.coin,
                size: position.size,
                entryPrice: position.entryPrice,
                unrealizedPnl: position.unrealizedPnl,
                leverage: position.leverage,
                takeProfitPrice,
                stopLossPrice,
              },
            },
          },
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknown');

        showToast(
          PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            errorMessage,
          ),
        );

        // Call error callback if provided
        options?.onError?.(errorMessage);
      } finally {
        DevLogger.log('usePerpsTPSLUpdate: Setting isUpdating to false');
        setIsUpdating(false);
      }
    },
    [
      updatePositionTPSL,
      showToast,
      PerpsToastOptions.positionManagement.tpsl,
      options,
    ],
  );

  return { handleUpdateTPSL, isUpdating };
}
