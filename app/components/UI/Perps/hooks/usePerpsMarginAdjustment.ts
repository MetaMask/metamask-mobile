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
import { strings } from '../../../../../locales/i18n';
import { translatePerpsError } from '../utils/translatePerpsError';
import { calculateMaxRemovableMargin } from '../utils/marginUtils';
import { usePerpsEventTracking } from './usePerpsEventTracking';

export interface UsePerpsMarginAdjustmentOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  /** Called with the new safe max when a removal was stopped because it shrank */
  onAmountChanged?: (maxAmount: number) => void;
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

/**
 * Hook for handling margin adjustment operations (add/remove margin from positions)
 * Provides consistent error handling, toast notifications, and Sentry tracking
 * @param options Optional callbacks for success and error cases
 * @returns handleAddMargin, handleRemoveMargin functions and loading state
 */
export function usePerpsMarginAdjustment(
  options?: UsePerpsMarginAdjustmentOptions,
) {
  const { updateMargin, getPositions } = usePerpsTrading();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const isAdjustingRef = useRef(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { track } = usePerpsEventTracking();

  // Re-reads the position so a removal is checked against what the exchange
  // will see, not the snapshot the form was built from. Returns
  // 'position_closed' when a successful read no longer has the position, and
  // null when the read fails so the submission is not blocked.
  const getFreshRemovableMargin = useCallback(
    async (
      symbol: string,
    ): Promise<
      { exchangeMax: number; safeMax: number } | 'position_closed' | null
    > => {
      try {
        const positions = await getPositions({ skipCache: true });
        const position = positions.find((p) => p.symbol === symbol);
        if (!position) {
          return 'position_closed';
        }
        const params = {
          currentMargin: parseFloat(position.marginUsed),
          positionSize: Math.abs(parseFloat(position.size)),
          entryPrice: parseFloat(position.entryPrice),
          currentPrice: 0,
          positionLeverage: position.leverage?.value ?? 0,
          notionalValue: parseFloat(position.positionValue),
        };
        // Unusable fields would read as "nothing removable"; treat them like
        // a failed read instead of blocking the removal.
        if (
          !(params.currentMargin > 0) ||
          !(params.notionalValue > 0) ||
          !(params.positionLeverage > 0)
        ) {
          return null;
        }
        return {
          exchangeMax: calculateMaxRemovableMargin({
            ...params,
            priceMoveBufferRatio: 0,
          }),
          safeMax: floorUsd(calculateMaxRemovableMargin(params)),
        };
      } catch (error) {
        DevLogger.log(
          'Fresh position read before margin removal failed:',
          error,
        );
        return null;
      }
    },
    [getPositions],
  );

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
        if (action === 'remove') {
          // The position can move between opening the form and submitting,
          // so re-check the amount against a fresh read before sending it.
          const fresh = await getFreshRemovableMargin(symbol);
          if (fresh === 'position_closed') {
            showToast(
              PerpsToastOptions.positionManagement.margin.adjustmentFailed(
                strings('perps.errors.position_not_found'),
              ),
            );
            return;
          }
          if (fresh && amount > fresh.exchangeMax) {
            showToast(
              PerpsToastOptions.positionManagement.margin.removeAmountChanged(
                fresh.safeMax.toFixed(2),
              ),
            );
            options?.onAmountChanged?.(fresh.safeMax);
            return;
          }
        }

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
      getFreshRemovableMargin,
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
