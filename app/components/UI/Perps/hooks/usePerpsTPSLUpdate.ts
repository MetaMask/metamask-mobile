import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import type { Position, TPSLTrackingData } from '../controllers/types';
import { captureException } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsStream } from '../providers/PerpsStreamManager';

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
  const stream = usePerpsStream();

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleUpdateTPSL = useCallback(
    async (
      position: Position,
      takeProfitPrice: string | undefined,
      stopLossPrice: string | undefined,
      trackingData?: TPSLTrackingData,
    ): Promise<{ success: boolean }> => {
      setIsUpdating(true);
      DevLogger.log('usePerpsTPSLUpdate: Setting isUpdating to true');

      try {
        const result = await updatePositionTPSL({
          coin: position.coin,
          takeProfitPrice,
          stopLossPrice,
          trackingData,
          position, // Pass live WebSocket position to avoid REST API fetch (prevents rate limiting)
        });

        if (result.success) {
          DevLogger.log('Position TP/SL updated successfully:', result);

          // Apply optimistic update immediately for better UX
          // This updates the UI before the WebSocket confirms the change
          stream.positions.updatePositionTPSLOptimistic(
            position.coin,
            takeProfitPrice,
            stopLossPrice,
          );

          showToast(
            PerpsToastOptions.positionManagement.tpsl.updateTPSLSuccess,
          );

          // Call success callback if provided
          options?.onSuccess?.();

          return { success: true };
        }
        DevLogger.log('Failed to update position TP/SL:', result.error);

        const errorMessage = result.error || strings('perps.errors.unknown');

        showToast(
          PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            errorMessage,
          ),
        );

        // Call error callback if provided
        options?.onError?.(errorMessage);

        return { success: false };
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

        return { success: false };
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
      stream,
    ],
  );

  return { handleUpdateTPSL, isUpdating };
}
