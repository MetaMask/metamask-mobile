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
import { TraceName } from '../../../../util/trace';
import {
  startPerpsCufTrace,
  endPerpsCufTrace,
  endPerpsCufTraceAfter,
  watchPerpsCufPositionChanged,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_TAG,
  PERPS_CUF_END_REASON,
  PERPS_CUF_STREAM_TIMEOUT_MS,
} from '../constants/perpsCufTags';

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

      // Confirmation CUF: ends when the live positions stream delivers the
      // backend-confirmed TP/SL change (that delivery runs the CUF dispatcher).
      // The optimistic cache patch renders sooner but does not end the span, so
      // this measures gesture -> confirmed live data, not the optimistic guess.
      const tpslCufOpId = startPerpsCufTrace({
        name: TraceName.PerpsUpdateTPSLToConfirmation,
      });
      watchPerpsCufPositionChanged(tpslCufOpId, position);
      endPerpsCufTraceAfter(
        {
          id: tpslCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.STREAM_TIMEOUT,
          },
        },
        PERPS_CUF_STREAM_TIMEOUT_MS,
      );

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
        endPerpsCufTrace({
          id: tpslCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
          },
        });

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
        endPerpsCufTrace({
          id: tpslCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
          },
        });
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
