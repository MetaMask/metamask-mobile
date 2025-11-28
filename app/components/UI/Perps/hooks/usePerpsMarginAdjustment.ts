import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import { captureException } from '@sentry/react-native';
import usePerpsToasts from './usePerpsToasts';
import { getPerpsDisplaySymbol } from '../utils/marketUtils';

export interface UsePerpsMarginAdjustmentOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for handling margin adjustment operations (add/remove margin from positions)
 * Provides consistent error handling, toast notifications, and Sentry tracking
 * @param options Optional callbacks for success and error cases
 * @returns handleAddMargin, handleRemoveMargin functions and loading state
 */
export function usePerpsMarginAdjustment(
  options?: UsePerpsMarginAdjustmentOptions,
) {
  const { updateMargin } = usePerpsTrading();
  const [isAdjusting, setIsAdjusting] = useState(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleMarginUpdate = useCallback(
    async (coin: string, amount: number, action: 'add' | 'remove') => {
      setIsAdjusting(true);
      DevLogger.log(
        `usePerpsMarginAdjustment: Setting isAdjusting to true (action: ${action})`,
      );

      try {
        // Convert amount to string with proper sign
        // Positive for add, negative for remove
        const adjustmentAmount = action === 'remove' ? -amount : amount;

        const result = await updateMargin({
          coin,
          amount: adjustmentAmount.toString(),
        });

        if (result.success) {
          DevLogger.log('Margin adjusted successfully:', result);

          // Show success toast
          const displaySymbol = getPerpsDisplaySymbol(coin);
          showToast(
            action === 'add'
              ? PerpsToastOptions.positionManagement.margin.addSuccess(
                  displaySymbol,
                  amount.toString(),
                )
              : PerpsToastOptions.positionManagement.margin.removeSuccess(
                  displaySymbol,
                  amount.toString(),
                ),
          );

          // Call success callback if provided
          options?.onSuccess?.();
        } else {
          DevLogger.log('Failed to adjust margin:', result.error);

          const errorMessage = result.error || strings('perps.errors.unknown');

          showToast(
            PerpsToastOptions.positionManagement.margin.adjustmentFailed(
              errorMessage,
            ),
          );

          // Call error callback if provided
          options?.onError?.(errorMessage);
        }
      } catch (error) {
        DevLogger.log('Error adjusting margin:', error);

        // Capture exception with margin context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: {
              component: 'usePerpsMarginAdjustment',
              action: `margin_${action}`,
              operation: 'position_management',
            },
            extra: {
              marginContext: {
                coin,
                amount,
                action,
                adjustmentAmount: action === 'remove' ? -amount : amount,
              },
            },
          },
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknown');

        showToast(
          PerpsToastOptions.positionManagement.margin.adjustmentFailed(
            errorMessage,
          ),
        );

        // Call error callback if provided
        options?.onError?.(errorMessage);
      } finally {
        DevLogger.log('usePerpsMarginAdjustment: Setting isAdjusting to false');
        setIsAdjusting(false);
      }
    },
    [
      updateMargin,
      showToast,
      PerpsToastOptions.positionManagement.margin,
      options,
    ],
  );

  const handleAddMargin = useCallback(
    (coin: string, amount: number) => handleMarginUpdate(coin, amount, 'add'),
    [handleMarginUpdate],
  );

  const handleRemoveMargin = useCallback(
    (coin: string, amount: number) =>
      handleMarginUpdate(coin, amount, 'remove'),
    [handleMarginUpdate],
  );

  return { handleAddMargin, handleRemoveMargin, isAdjusting };
}
