import { useCallback, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position, OrderResult } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import { strings } from '../../../../../locales/i18n';
import { handlePerpsError } from '../utils/perpsErrorHandler';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';

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
  const { track } = usePerpsEventTracking();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleClosePosition = useCallback(
    async (
      position: Position,
      size?: string,
      orderType: 'market' | 'limit' = 'market',
      limitPrice?: string,
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

        const closeStartTime = performance.now();

        const isLong = parseFloat(position.size) >= 0;
        const direction = isLong
          ? strings('perps.market.long')
          : strings('perps.market.short');

        if (orderType === 'market') {
          // Market closing full position
          if (size === undefined || size === '') {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
                direction,
                position.size,
                position.coin,
              ),
            );
          } else {
            // Market closing partial position
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
          if (size === undefined || size === '') {
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

        // Close position
        const result = await closePosition({
          coin: position.coin,
          size, // If undefined, will close full position
          orderType,
          price: limitPrice,
        });

        // Measure close order submission toast
        const submissionDuration = performance.now() - closeStartTime;
        setMeasurement(
          PerpsMeasurementName.CLOSE_ORDER_SUBMISSION_TOAST_LOADED,
          submissionDuration,
          'millisecond',
        );

        DevLogger.log('usePerpsClosePosition: Close result', result);

        if (result.success) {
          // Check if position was partially closed
          const closeSize = parseFloat(size || position.size);
          const positionSize = Math.abs(parseFloat(position.size));
          const filledSize = result.filledSize
            ? parseFloat(result.filledSize)
            : closeSize;
          const isPartiallyFilled = filledSize > 0 && filledSize < closeSize;

          if (isPartiallyFilled) {
            // Track partially filled close event
            track(MetaMetricsEvents.PERPS_POSITION_CLOSE_PARTIALLY_FILLED, {
              [PerpsEventProperties.ASSET]: position.coin,
              [PerpsEventProperties.DIRECTION]:
                parseFloat(position.size) > 0
                  ? PerpsEventValues.DIRECTION.LONG
                  : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.OPEN_POSITION_SIZE]: positionSize,
              [PerpsEventProperties.ORDER_SIZE]: closeSize,
              [PerpsEventProperties.ORDER_TYPE]: orderType,
              [PerpsEventProperties.AMOUNT_FILLED]: filledSize,
              [PerpsEventProperties.REMAINING_AMOUNT]: closeSize - filledSize,
              [PerpsEventProperties.COMPLETION_DURATION]:
                performance.now() - closeStartTime,
            });
          }

          // Measure close order confirmation toast
          const confirmationDuration = performance.now() - closeStartTime;
          setMeasurement(
            PerpsMeasurementName.CLOSE_ORDER_CONFIRMATION_TOAST_LOADED,
            confirmationDuration,
            'millisecond',
          );

          // Track position close executed
          track(MetaMetricsEvents.PERPS_POSITION_CLOSE_EXECUTED, {
            [PerpsEventProperties.ASSET]: position.coin,
            [PerpsEventProperties.DIRECTION]:
              parseFloat(position.size) > 0
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: orderType,
            [PerpsEventProperties.COMPLETION_DURATION]:
              performance.now() - closeStartTime,
          });

          // Market order immediately fills or fails
          // Limit orders aren't guaranteed to fill immediately, so we don't display "close position success" toast for them.
          if (orderType === 'market') {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose
                .full.closeFullPositionSuccess,
            );
          }

          // Call success callback
          options?.onSuccess?.(result);
        } else {
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

        // Track position close failed event as required by specs
        track(MetaMetricsEvents.PERPS_POSITION_CLOSE_FAILED, {
          [PerpsEventProperties.ASSET]: position.coin,
          [PerpsEventProperties.ERROR_MESSAGE]: closeError.message,
          [PerpsEventProperties.DIRECTION]:
            parseFloat(position.size) > 0
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_SIZE]: size?.toString(),
        });

        // Call error callback
        options?.onError?.(closeError);

        throw closeError;
      } finally {
        setIsClosing(false);
      }
    },
    [
      PerpsToastOptions.positionManagement,
      closePosition,
      options,
      showToast,
      track,
    ],
  );

  return {
    handleClosePosition,
    isClosing,
    error,
  };
};
