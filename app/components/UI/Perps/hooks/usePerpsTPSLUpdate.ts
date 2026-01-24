import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import type { Position, TPSLTrackingData } from '../controllers/types';
import { captureException } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { retryWithExponentialDelay } from '../../../../util/exponential-retry';

/**
 * Retry configuration for rate limiting resilience.
 *
 * HyperLiquid rate limits:
 * - IP-based: 1,200 weighted requests per minute
 * - Address-based: 1 request per 1 USDC traded (lifetime) + 10,000 initial buffer
 * - When rate limited: addresses receive 1 request every 10 seconds (drip recovery)
 *
 * Strategy: Retry with exponential backoff, but fail fast (~14s total) to avoid
 * leaving the user waiting too long. Sequence: 2s → 4s → 8s = ~14s total.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits
 */
const TPSL_UPDATE_MAX_RETRIES = 3;
const TPSL_UPDATE_BASE_DELAY_MS = 2000;
const TPSL_UPDATE_MAX_DELAY_MS = 10000;

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
        // Wrap API call with exponential backoff retry for rate limiting resilience
        // The inner function throws on failure to trigger retries (since updatePositionTPSL
        // returns { success: false } instead of throwing)
        const result = await retryWithExponentialDelay(
          async () => {
            const res = await updatePositionTPSL({
              symbol: position.symbol,
              takeProfitPrice,
              stopLossPrice,
              trackingData,
              position, // Pass live WebSocket position to avoid REST API fetch (prevents rate limiting)
            });
            if (!res.success) {
              // Throw to trigger retry - the error message will be used if all retries fail
              throw new Error(res.error || 'TP/SL update failed');
            }
            return res;
          },
          TPSL_UPDATE_MAX_RETRIES,
          TPSL_UPDATE_BASE_DELAY_MS,
          TPSL_UPDATE_MAX_DELAY_MS,
          true, // Enable jitter to prevent thundering herd
        );

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
                symbol: position.symbol,
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
