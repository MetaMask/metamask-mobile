import { useCallback, useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';

/**
 * Hook to monitor withdrawal status and show appropriate toasts
 * Handles both withdrawal initiated and withdrawal complete states
 */
export const usePerpsWithdrawStatus = () => {
  const { toastRef } = useContext(ToastContext);

  const lastWithdrawResult = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastWithdrawResult ?? null,
  );

  const clearWithdrawResult = useCallback(() => {
    const controller = Engine.context.PerpsController;
    controller?.clearWithdrawResult();
  }, []);

  // Track if we've already processed the current result
  const hasProcessedResultRef = useRef<string | null>(null);

  useEffect(() => {
    // Create a unique identifier for this result to prevent duplicate toasts
    const resultId = lastWithdrawResult
      ? `${lastWithdrawResult.success}-${
          lastWithdrawResult.txHash || lastWithdrawResult.error
        }`
      : null;

    // Skip if we've already processed this result or if there's no result
    if (
      !lastWithdrawResult ||
      (resultId && resultId === hasProcessedResultRef.current)
    ) {
      return;
    }

    // Mark this result as processed
    if (resultId) {
      hasProcessedResultRef.current = resultId;
    }

    DevLogger.log('usePerpsWithdrawStatus: Processing result', {
      lastWithdrawResult,
      resultId,
    });

    let timeoutId: NodeJS.Timeout | null = null;

    if (lastWithdrawResult.success) {
      // Parse amount from the result if available
      const amount = lastWithdrawResult.amount || '';

      // Show withdrawal initiated toast with arrival time info
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: `${strings('perps.withdrawal.success_toast')}\n${strings(
              'perps.withdrawal.arrival_time',
              {
                amount,
                symbol: 'USDC',
              },
            )}`,
            isBold: false,
          },
        ],
      });

      // Clear the result after showing toast
      timeoutId = setTimeout(() => {
        clearWithdrawResult();
        hasProcessedResultRef.current = null;
      }, 500);
    } else {
      // Show error toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: `${strings('perps.withdrawal.error')}\n${
              lastWithdrawResult.error ||
              strings('perps.withdrawal.error_generic')
            }`,
            isBold: false,
          },
        ],
      });

      // Clear the result after showing toast
      timeoutId = setTimeout(() => {
        clearWithdrawResult();
        hasProcessedResultRef.current = null;
      }, 500);
    }

    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [lastWithdrawResult, toastRef, clearWithdrawResult]);

  return { withdrawInProgress: !!lastWithdrawResult };
};
