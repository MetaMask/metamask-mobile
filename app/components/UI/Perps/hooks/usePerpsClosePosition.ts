import { useCallback, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position, OrderResult } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import { strings } from '../../../../../locales/i18n';
import { translatePerpsError } from '../utils/translatePerpsError';
import {
  PERPS_ERROR_CODES,
  type PerpsErrorCode,
} from '../controllers/PerpsController';

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

        const result = await closePosition({
          coin: position.coin,
          size, // If undefined, will close full position
          orderType,
          price: limitPrice,
        });

        DevLogger.log('usePerpsClosePosition: Close result', result);

        if (result.success) {
          // Call success callback
          options?.onSuccess?.(result);
        } else {
          // Check if error is a PerpsController error code
          const errorMessage =
            result.error &&
            Object.values(PERPS_ERROR_CODES).includes(
              result.error as PerpsErrorCode,
            )
              ? translatePerpsError(result.error)
              : result.error || strings('perps.close_position.error_unknown');
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
    [closePosition, options],
  );

  return {
    handleClosePosition,
    isClosing,
    error,
  };
};
