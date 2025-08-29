import { useCallback } from 'react';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { PerpsEventProperties } from '../constants/eventNames';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PERPS_ERROR_CODES } from '../controllers/PerpsController';
import { isPerpsErrorCode } from '../utils/perpsErrorHandler';

/**
 * Error context for tracking
 */
export interface PerpsErrorContext {
  operation?: string;
  asset?: string;
  direction?: 'long' | 'short';
  orderType?: 'market' | 'limit';
  amount?: string | number;
  provider?: string;
  [key: string]: string | number | undefined;
}

/**
 * Hook for tracking Perps errors with PERPS_ERROR_ENCOUNTERED event
 */
export function usePerpsErrorTracking() {
  const { trackEvent, createEventBuilder } = useMetrics();

  /**
   * Extract error code from error
   */
  const getErrorCode = useCallback((error: unknown): string => {
    // Check if it's a PerpsController error code
    const errorString = error instanceof Error ? error.message : String(error);

    // Check each known error code
    for (const code of Object.values(PERPS_ERROR_CODES)) {
      if (isPerpsErrorCode(error, code)) {
        return code;
      }
    }

    // For Hyperliquid-specific errors, try to extract meaningful info
    if (errorString.includes('insufficient')) {
      return 'INSUFFICIENT_BALANCE';
    }
    if (errorString.includes('slippage')) {
      return 'SLIPPAGE_EXCEEDED';
    }
    if (errorString.includes('market closed')) {
      return 'MARKET_CLOSED';
    }
    if (errorString.includes('position size')) {
      return 'INVALID_POSITION_SIZE';
    }
    if (errorString.includes('leverage')) {
      return 'INVALID_LEVERAGE';
    }
    if (errorString.includes('price')) {
      return 'INVALID_PRICE';
    }

    // Default to the raw error message if not a known code
    return errorString;
  }, []);

  /**
   * Track error with PERPS_ERROR_ENCOUNTERED event
   */
  const trackError = useCallback(
    (error: unknown, context?: PerpsErrorContext) => {
      const errorCode = getErrorCode(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log error for debugging
      DevLogger.log('PerpsErrorTracking: Error encountered', {
        errorCode,
        errorMessage,
        context,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Build event properties
      const eventProperties: Record<string, string | number> = {
        'Error Code': errorCode,
        [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
        [PerpsEventProperties.TIMESTAMP]: Date.now(),
      };

      // Add context properties if provided
      if (context) {
        if (context.operation) {
          eventProperties.Operation = context.operation;
        }
        if (context.asset) {
          eventProperties[PerpsEventProperties.ASSET] = context.asset;
        }
        if (context.direction) {
          eventProperties[PerpsEventProperties.DIRECTION] =
            context.direction === 'long' ? 'Long' : 'Short';
        }
        if (context.orderType) {
          eventProperties[PerpsEventProperties.ORDER_TYPE] = context.orderType;
        }
        if (context.amount !== undefined) {
          eventProperties.Amount = String(context.amount);
        }
        if (context.provider) {
          eventProperties.Provider = context.provider;
        }
      }

      // Track the error event
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_ERROR_ENCOUNTERED)
          .addProperties(eventProperties)
          .build(),
      );

      return errorCode;
    },
    [getErrorCode, trackEvent, createEventBuilder],
  );

  return {
    trackError,
    getErrorCode,
  };
}
