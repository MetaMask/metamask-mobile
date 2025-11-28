import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import type { Position } from '../controllers/types';
import { captureException } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';
import { getPerpsDisplaySymbol } from '../utils/marketUtils';
import type { OrderDirection } from '../types/perps-types';

export interface UsePerpsFlipPositionOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for flipping (reversing) position direction
 * Converts long positions to short and vice versa
 * Provides consistent error handling, toast notifications, and Sentry tracking
 * @param options Optional callbacks for success and error cases
 * @returns handleFlipPosition function and loading state
 */
export function usePerpsFlipPosition(options?: UsePerpsFlipPositionOptions) {
  const { flipPosition } = usePerpsTrading();
  const [isFlipping, setIsFlipping] = useState(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleFlipPosition = useCallback(
    async (position: Position) => {
      setIsFlipping(true);
      DevLogger.log('usePerpsFlipPosition: Setting isFlipping to true');

      // Determine current and opposite direction
      const currentDirection: OrderDirection =
        parseFloat(position.size) > 0 ? 'long' : 'short';
      const oppositeDirection: OrderDirection =
        currentDirection === 'long' ? 'short' : 'long';
      const positionSize = Math.abs(parseFloat(position.size));

      try {
        const result = await flipPosition({
          coin: position.coin,
          position,
        });

        if (result.success) {
          DevLogger.log('Position flipped successfully:', result);

          // Show success toast using existing market order confirmation toast
          // (flip is implemented as a market order in opposite direction)
          const displaySymbol = getPerpsDisplaySymbol(position.coin);
          showToast(
            PerpsToastOptions.orderManagement.market.confirmed(
              oppositeDirection,
              positionSize.toString(),
              displaySymbol,
            ),
          );

          // Call success callback if provided
          options?.onSuccess?.();
        } else {
          DevLogger.log('Failed to flip position:', result.error);

          const errorMessage = result.error || strings('perps.errors.unknown');

          showToast(
            PerpsToastOptions.orderManagement.market.creationFailed(
              errorMessage,
            ),
          );

          // Call error callback if provided
          options?.onError?.(errorMessage);
        }
      } catch (error) {
        DevLogger.log('Error flipping position:', error);

        // Capture exception with position context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: {
              component: 'usePerpsFlipPosition',
              action: 'flip_position',
              operation: 'position_management',
            },
            extra: {
              positionContext: {
                coin: position.coin,
                size: position.size,
                currentDirection,
                targetDirection: oppositeDirection,
                positionSize,
                entryPrice: position.entryPrice,
                unrealizedPnl: position.unrealizedPnl,
                leverage: position.leverage,
              },
            },
          },
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknown');

        showToast(
          PerpsToastOptions.orderManagement.market.creationFailed(errorMessage),
        );

        // Call error callback if provided
        options?.onError?.(errorMessage);
      } finally {
        DevLogger.log('usePerpsFlipPosition: Setting isFlipping to false');
        setIsFlipping(false);
      }
    },
    [
      flipPosition,
      showToast,
      PerpsToastOptions.orderManagement.market,
      options,
    ],
  );

  return { handleFlipPosition, isFlipping };
}
