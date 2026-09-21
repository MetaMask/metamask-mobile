import { useCallback, useRef, useState } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { translatePerpsError } from '../utils/translatePerpsError';
import { usePerpsEventTracking } from './usePerpsEventTracking';

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
  const { track } = usePerpsEventTracking();

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

      // Positive for add, negative for remove
      const adjustmentAmount = action === 'remove' ? -amount : amount;
      const trackAdjustment = (
        status:
          | typeof PERPS_EVENT_VALUE.STATUS.SUCCESS
          | typeof PERPS_EVENT_VALUE.STATUS.FAILED,
        errorMessage?: string,
      ) => {
        track(MetaMetricsEvents.PERPS_MARGIN_ADJUSTMENT_TRANSACTION, {
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.ACTION]: action,
          [PERPS_EVENT_PROPERTY.STATUS]: status,
          ...(errorMessage && {
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
          }),
        });
      };

      try {
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

          trackAdjustment(PERPS_EVENT_VALUE.STATUS.SUCCESS);

          // Call success callback if provided
          options?.onSuccess?.();
        } else {
          DevLogger.log('Failed to adjust margin:', result.error);

          const errorMessage = translatePerpsError(result.error);
          trackAdjustment(PERPS_EVENT_VALUE.STATUS.FAILED, errorMessage);

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
        trackAdjustment(PERPS_EVENT_VALUE.STATUS.FAILED, errorMessage);

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
      track,
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
