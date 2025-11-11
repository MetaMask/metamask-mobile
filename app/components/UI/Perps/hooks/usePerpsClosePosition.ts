import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { OrderResult, Position, TrackingData } from '../controllers/types';
import { handlePerpsError } from '../utils/perpsErrorHandler';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

interface UsePerpsClosePositionOptions {
  onSuccess?: (result: OrderResult) => void;
  onError?: (error: Error) => void;
}

export const usePerpsClosePosition = (
  options?: UsePerpsClosePositionOptions,
) => {
  const { closePosition } = usePerpsTrading();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleClosePosition = useCallback(
    async (
      position: Position,
      size?: string,
      orderType: 'market' | 'limit' = 'market',
      limitPrice?: string,
      trackingData?: TrackingData,
      marketPrice?: string, // Used for PnL toast to lock in the market price at time of closing
      // Slippage parameters for consistent validation
      usdAmount?: string,
      priceAtCalculation?: number,
      maxSlippageBps?: number,
    ) => {
      try {
        setIsClosing(true);
        setError(null);

        DevLogger.log('usePerpsClosePosition: Closing position', {
          coin: position.coin,
          size,
          orderType,
          limitPrice,
        });
        const isLong = Number.parseFloat(position.size) >= 0;
        const direction = isLong
          ? strings('perps.market.long')
          : strings('perps.market.short');

        const isFullClose = size === undefined || size === '';

        if (orderType === 'market') {
          // Market closing full position
          if (isFullClose) {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
                direction,
                position.size,
                position.coin,
              ),
            );
          }
          // Market closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
                direction,
                size,
                position.coin,
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
                position.coin,
              ),
            );
          }
          // Limit closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
                direction,
                size,
                position.coin,
              ),
            );
          }
        }

        // Close position with slippage parameters for consistent validation
        const result = await closePosition({
          coin: position.coin,
          size, // If undefined, will close full position
          orderType,
          price: limitPrice,
          trackingData,
          // Pass through slippage parameters
          usdAmount,
          priceAtCalculation,
          maxSlippageBps,
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

          throw new Error(errorMessage);
        }

        return result;
      } catch (err) {
        const closeError =
          err instanceof Error
            ? err
            : new Error(strings('perps.close_position.error_unknown'));

        DevLogger.log(
          'usePerpsClosePosition: Error closing position',
          closeError,
        );
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
