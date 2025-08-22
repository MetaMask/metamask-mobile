import { useCallback, useContext, useState } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';
import type { Position } from '../controllers/types';

interface UseTPSLUpdateOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for handling TP/SL updates with consistent toast notifications
 * @param options Optional callbacks for success and error cases
 * @returns handleUpdateTPSL function and loading state
 */
export function usePerpsTPSLUpdate(options?: UseTPSLUpdateOptions) {
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;
  const { updatePositionTPSL } = usePerpsTrading();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateTPSL = useCallback(
    async (
      position: Position,
      takeProfitPrice: string | undefined,
      stopLossPrice: string | undefined,
    ) => {
      setIsUpdating(true);
      DevLogger.log('usePerpsTPSLUpdate: Setting isUpdating to true');

      try {
        // E2E Mode: Return mock success result to avoid actual TP/SL updates
        let result;
        if (shouldDisablePerpsStreaming()) {
          result = {
            success: true,
            orderId: `mock-tpsl-${Date.now()}`,
            filledSize: position.size,
            averagePrice: position.entryPrice,
          };

          DevLogger.log(
            'usePerpsTPSLUpdate: Mock TP/SL updated successfully (E2E mode)',
            { coin: position.coin, takeProfitPrice, stopLossPrice },
          );
        } else {
          result = await updatePositionTPSL({
            coin: position.coin,
            takeProfitPrice,
            stopLossPrice,
          });
        }

        if (result.success) {
          DevLogger.log('Position TP/SL updated successfully:', result);

          // Show success toast
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              {
                label: strings('perps.position.tpsl.update_success'),
                isBold: true,
              },
              { label: ' - ', isBold: false },
              {
                label: position.coin,
                isBold: true,
              },
            ],
            iconName: IconName.CheckBold,
            iconColor: IconColor.Success,
            hasNoTimeout: false,
          });

          // Call success callback if provided
          options?.onSuccess?.();
        } else {
          DevLogger.log('Failed to update position TP/SL:', result.error);

          // Show error toast
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              {
                label: strings('perps.position.tpsl.update_failed'),
                isBold: true,
              },
              { label: ': ', isBold: false },
              {
                label: result.error || strings('perps.errors.unknown'),
                isBold: false,
              },
            ],
            iconName: IconName.Error,
            iconColor: IconColor.Error,
            hasNoTimeout: true,
            closeButtonOptions: {
              label: strings('perps.order.error.dismiss'),
              variant: ButtonVariants.Secondary,
              onPress: () => toastRef?.current?.closeToast(),
            },
          });

          // Call error callback if provided
          options?.onError?.(result.error || strings('perps.errors.unknown'));
        }
      } catch (error) {
        DevLogger.log('Error updating position TP/SL:', error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknown');

        // Show error toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.position.tpsl.update_error'),
              isBold: true,
            },
            { label: ': ', isBold: false },
            {
              label: errorMessage,
              isBold: false,
            },
          ],
          iconName: IconName.Error,
          iconColor: IconColor.Error,
          hasNoTimeout: true,
          closeButtonOptions: {
            label: strings('perps.order.error.dismiss'),
            variant: ButtonVariants.Secondary,
            onPress: () => toastRef?.current?.closeToast(),
          },
        });

        // Call error callback if provided
        options?.onError?.(errorMessage);
      } finally {
        DevLogger.log('usePerpsTPSLUpdate: Setting isUpdating to false');
        setIsUpdating(false);
      }
    },
    [updatePositionTPSL, toastRef, options],
  );

  return { handleUpdateTPSL, isUpdating };
}
