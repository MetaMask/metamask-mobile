import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { usePerpsTrading } from './usePerpsTrading';
import {
  PERPS_CONSTANTS,
  type Position,
  type TPSLTrackingData,
} from '@metamask/perps-controller';
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
          symbol: position.symbol,
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
            position.symbol,
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

        Logger.error(ensureError(error, 'usePerpsTPSLUpdate.handle'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsTPSLUpdate',
            action: 'position_tpsl_update',
            operation: 'position_management',
          },
          context: {
            name: 'usePerpsTPSLUpdate',
            data: {
              symbol: position.symbol,
              size: position.size,
              entryPrice: position.entryPrice,
              unrealizedPnl: position.unrealizedPnl,
              leverage: position.leverage,
              takeProfitPrice,
              stopLossPrice,
              rawError:
                error instanceof Error
                  ? undefined
                  : error === undefined
                    ? 'undefined'
                    : String(error),
            },
          },
        });

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
