import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import {
  PERPS_CONSTANTS,
  type OrderResult,
  type Position,
  type TrackingData,
} from '@metamask/perps-controller';
import { handlePerpsError } from '../utils/translatePerpsError';
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
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

interface UsePerpsClosePositionOptions {
  onSuccess?: (result: OrderResult) => void;
  onError?: (error: Error) => void;
}

interface ClosePositionParams {
  // Required
  position: Position;

  // Core parameters
  size?: string;
  orderType?: 'market' | 'limit';
  limitPrice?: string;

  // Tracking data
  trackingData?: TrackingData;
  marketPrice?: string; // Used for PnL toast to lock in the market price at time of closing

  // Slippage validation (grouped for clarity)
  slippage?: {
    usdAmount?: string;
    priceAtCalculation?: number;
    maxSlippageBps?: number;
  };
}

export const usePerpsClosePosition = (
  options?: UsePerpsClosePositionOptions,
) => {
  const { closePosition } = usePerpsTrading();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleClosePosition = useCallback(
    async (params: ClosePositionParams) => {
      const {
        position,
        size,
        orderType = 'market',
        limitPrice,
        trackingData,
        marketPrice,
        slippage,
      } = params;
      const isFullClose = size === undefined || size === '';

      // Confirmation CUF (market close): ends when the stream shows the
      // position reduced or absent. Limit closes rest until filled, so their
      // confirmation is not a render-latency measurement.
      if (orderType === 'market') {
        startPerpsCufTrace({
          name: TraceName.PerpsClosePositionToConfirmation,
        });
        watchPerpsCufPositionChanged(
          TraceName.PerpsClosePositionToConfirmation,
          position,
        );
        endPerpsCufTraceAfter(
          {
            name: TraceName.PerpsClosePositionToConfirmation,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.STREAM_TIMEOUT,
            },
          },
          PERPS_CUF_STREAM_TIMEOUT_MS,
        );
      }

      try {
        setIsClosing(true);
        setError(null);

        DevLogger.log('usePerpsClosePosition: Closing position', {
          symbol: position.symbol,
          size,
          orderType,
          limitPrice,
        });
        const isLong = Number.parseFloat(position.size) >= 0;
        const direction = isLong
          ? strings('perps.market.long')
          : strings('perps.market.short');

        if (orderType === 'market') {
          // Market closing full position
          if (isFullClose) {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
                direction,
                position.size,
                position.symbol,
              ),
            );
          }
          // Market closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
                direction,
                size,
                position.symbol,
              ),
            );
          }
        }

        if (orderType === 'limit') {
          // Limit closing full position
          if (isFullClose) {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose.full.fullPositionCloseSubmitted(
                direction,
                position.size,
                position.symbol,
              ),
            );
          }
          // Limit closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
                direction,
                size,
                position.symbol,
              ),
            );
          }
        }

        // Close position with slippage parameters for consistent validation
        const result = await closePosition({
          symbol: position.symbol,
          size, // If undefined, will close full position
          orderType,
          price: limitPrice,
          trackingData,
          // Pass through slippage parameters
          usdAmount: slippage?.usdAmount,
          priceAtCalculation: slippage?.priceAtCalculation,
          maxSlippageBps: slippage?.maxSlippageBps,
          // Pass live position to avoid getPositions() API call (prevents 429 rate limiting)
          position,
        });

        DevLogger.log('usePerpsClosePosition: Close result', result);

        if (result.success) {
          // Market order immediately fills or fails
          // Limit orders aren't guaranteed to fill immediately, so we don't display "close position success" toast for them.
          // Note: We only support market close for now but keeping check for future limit close support.
          if (orderType === 'market') {
            // Market closed full position
            if (isFullClose) {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionSuccess(
                  position,
                  marketPrice,
                ),
              );
            }
            // Market closed partial position
            else {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionSuccess(
                  position,
                  marketPrice,
                ),
              );
            }
          }

          // Call success callback
          options?.onSuccess?.(result);
        } else {
          // Note: We only support market close for now but keeping check for future limit close support.
          if (orderType === 'market') {
            // Market full close failed
            if (isFullClose) {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose
                  .full.closeFullPositionFailed,
              );
            }
            // Market partial close failed
            else {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose
                  .partial.closePartialPositionFailed,
              );
            }
          }

          // Use centralized error handler for all errors
          const errorMessage = handlePerpsError({
            error: result.error,
            fallbackMessage: strings('perps.close_position.error_unknown'),
          });

          // Rejected request, not an exception: classify before the throw so
          // the catch's EXCEPTION end no-ops (matches TPSL/cancel paths).
          endPerpsCufTrace({
            name: TraceName.PerpsClosePositionToConfirmation,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
            },
          });
          throw new Error(errorMessage);
        }

        return result;
      } catch (err) {
        endPerpsCufTrace({
          name: TraceName.PerpsClosePositionToConfirmation,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
          },
        });
        const closeError =
          err instanceof Error
            ? err
            : new Error(strings('perps.close_position.error_unknown'));

        DevLogger.log(
          'usePerpsClosePosition: Error closing position',
          closeError,
        );
        Logger.error(closeError, {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsClosePosition',
            action: 'close_position',
            operation: 'position_management',
          },
          context: {
            name: 'usePerpsClosePosition',
            data: {
              symbol: position.symbol,
              positionSize: position.size,
              requestedSize: size,
              orderType,
              isFullClose,
              limitPrice,
              marketPrice,
              trackingSource: trackingData?.source,
              tradeAction: trackingData?.tradeAction,
              inputMethod: trackingData?.inputMethod,
              totalFee: trackingData?.totalFee,
              realizedPnl: trackingData?.realizedPnl,
              receivedAmount: trackingData?.receivedAmount,
              rawError:
                err instanceof Error
                  ? undefined
                  : err === undefined
                    ? 'undefined'
                    : String(err),
            },
          },
        });
        setError(closeError);

        // Call error callback
        options?.onError?.(closeError);

        throw closeError;
      } finally {
        setIsClosing(false);
      }
    },
    [PerpsToastOptions.positionManagement, closePosition, options, showToast],
  );

  return {
    handleClosePosition,
    isClosing,
    error,
  };
};
