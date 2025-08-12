import { useCallback, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position, OrderResult } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import { strings } from '../../../../../locales/i18n';
import { handlePerpsError } from '../utils/perpsErrorHandler';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { usePerpsErrorTracking } from './usePerpsErrorTracking';

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
  const { trackEvent, createEventBuilder } = useMetrics();
  const { trackError } = usePerpsErrorTracking();

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
            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.PERPS_POSITION_CLOSE_PARTIALLY_FILLED,
              )
                .addProperties({
                  [PerpsEventProperties.TIMESTAMP]: Date.now(),
                  [PerpsEventProperties.ASSET]: position.coin,
                  [PerpsEventProperties.DIRECTION]:
                    parseFloat(position.size) > 0
                      ? PerpsEventValues.DIRECTION.LONG
                      : PerpsEventValues.DIRECTION.SHORT,
                  [PerpsEventProperties.OPEN_POSITION_SIZE]: positionSize,
                  [PerpsEventProperties.ORDER_SIZE]: closeSize,
                  [PerpsEventProperties.ORDER_TYPE]: orderType,
                  'Amount filled': filledSize,
                  'Remaining amount': closeSize - filledSize,
                  [PerpsEventProperties.COMPLETION_DURATION]:
                    performance.now() - closeStartTime,
                })
                .build(),
            );
          }

          // Measure close order confirmation toast
          const confirmationDuration = performance.now() - closeStartTime;
          setMeasurement(
            PerpsMeasurementName.CLOSE_ORDER_CONFIRMATION_TOAST_LOADED,
            confirmationDuration,
            'millisecond',
          );

          // Track position close executed
          trackEvent(
            createEventBuilder(MetaMetricsEvents.PERPS_POSITION_CLOSE_EXECUTED)
              .addProperties({
                [PerpsEventProperties.TIMESTAMP]: Date.now(),
                [PerpsEventProperties.ASSET]: position.coin,
                [PerpsEventProperties.DIRECTION]:
                  parseFloat(position.size) > 0
                    ? PerpsEventValues.DIRECTION.LONG
                    : PerpsEventValues.DIRECTION.SHORT,
                [PerpsEventProperties.ORDER_TYPE]: orderType,
                [PerpsEventProperties.COMPLETION_DURATION]:
                  performance.now() - closeStartTime,
              })
              .build(),
          );

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

        // Track general error
        trackError(err, {
          operation: 'close_position',
          asset: position.coin,
          direction: parseFloat(position.size) > 0 ? 'long' : 'short',
          amount: size?.toString(),
        });

        // Track position close failed (specific event required by specs)
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PERPS_POSITION_CLOSE_FAILED)
            .addProperties({
              [PerpsEventProperties.TIMESTAMP]: Date.now(),
              [PerpsEventProperties.ASSET]: position.coin,
              [PerpsEventProperties.ERROR_MESSAGE]: closeError.message,
            })
            .build(),
        );

        // Call error callback
        options?.onError?.(closeError);

        throw closeError;
      } finally {
        setIsClosing(false);
      }
    },
    [closePosition, options, trackEvent, createEventBuilder, trackError],
  );

  return {
    handleClosePosition,
    isClosing,
    error,
  };
};
