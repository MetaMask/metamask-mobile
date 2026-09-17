import { useCallback, useRef, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
} from '@metamask/perps-controller';
import { translatePerpsError } from '../utils/translatePerpsError';

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
  const isAdjustingRef = useRef(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleMarginUpdate = useCallback(
    async (symbol: string, amount: number, action: 'add' | 'remove') => {
      if (isAdjustingRef.current) {
        return;
      }

      isAdjustingRef.current = true;
      setIsAdjusting(true);
      DevLogger.log(
        `usePerpsMarginAdjustment: Setting isAdjusting to true (action: ${action})`,
      );

      try {
        // Convert amount to string with proper sign
        // Positive for add, negative for remove
        const adjustmentAmount = action === 'remove' ? -amount : amount;

        const result = await updateMargin({
          symbol,
          amount: adjustmentAmount.toString(),
        });

        if (result.success) {
          DevLogger.log('Margin adjusted successfully:', result);

          // Show success toast
          const displaySymbol = getPerpsDisplaySymbol(symbol);
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

          const errorMessage = translatePerpsError(result.error);

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

        Logger.error(ensureError(error, 'usePerpsMarginAdjustment.handle'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsMarginAdjustment',
            action: `margin_${action}`,
            operation: 'position_management',
          },
          context: {
            name: 'usePerpsMarginAdjustment',
            data: {
              symbol,
              amount,
              action,
              adjustmentAmount: action === 'remove' ? -amount : amount,
              rawError:
                error instanceof Error
                  ? undefined
                  : error === undefined
                    ? 'undefined'
                    : String(error),
            },
          },
        });

        const errorMessage = translatePerpsError(error);

        showToast(
          PerpsToastOptions.positionManagement.margin.adjustmentFailed(
            errorMessage,
          ),
        );

        // Call error callback if provided
        options?.onError?.(errorMessage);
      } finally {
        DevLogger.log('usePerpsMarginAdjustment: Setting isAdjusting to false');
        isAdjustingRef.current = false;
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
    (symbol: string, amount: number) =>
      handleMarginUpdate(symbol, amount, 'add'),
    [handleMarginUpdate],
  );

  const handleRemoveMargin = useCallback(
    (symbol: string, amount: number) =>
      handleMarginUpdate(symbol, amount, 'remove'),
    [handleMarginUpdate],
  );

  return { handleAddMargin, handleRemoveMargin, isAdjusting };
}
