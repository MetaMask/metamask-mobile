import { useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import type { RootState } from '../../../../reducers';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Hook to monitor deposit status and show appropriate toasts
 *
 * This hook watches for changes in deposit state and shows:
 * - In-progress toast when deposit starts
 * - Success toast when deposit completes successfully
 * - Error toast when deposit fails (but not for user cancellation)
 * - Automatically clears the result after showing the toast
 */
export const usePerpsDepositStatus = () => {
  const { toastRef } = useContext(ToastContext);
  const { clearDepositResult } = usePerpsTrading();

  // Track which results we've already shown toasts for
  const hasProcessedResultRef = useRef<string | null>(null);

  // Get deposit state from controller
  const depositInProgress = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.depositInProgress ?? false,
  );

  const lastDepositResult = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositResult ?? null,
  );

  // Clear stale results on mount
  useEffect(() => {
    // If there's a result on mount, it's stale from a previous session
    if (lastDepositResult) {
      DevLogger.log(
        'usePerpsDepositStatus: Clearing stale deposit result on mount',
      );
      clearDepositResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally omitting dependencies

  // Don't show in-progress toast based on depositInProgress
  // We'll only show toasts when we have actual results

  // Update toast when deposit state changes
  useEffect(() => {
    // Create a unique identifier for this result to prevent duplicate toasts
    const resultId = lastDepositResult
      ? `${lastDepositResult.success}-${
          lastDepositResult.txHash || lastDepositResult.error
        }`
      : null;

    // Show/update toast if we have a NEW result that hasn't been processed
    if (lastDepositResult && resultId !== hasProcessedResultRef.current) {
      hasProcessedResultRef.current = resultId;

      DevLogger.log('usePerpsDepositStatus: Showing deposit toast', {
        success: lastDepositResult.success,
        txHash: lastDepositResult.txHash,
        error: lastDepositResult.error,
      });

      // Check if this is the "pending" state
      if (lastDepositResult.error === 'pending') {
        // Show in-progress toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hasNoTimeout: true, // Keep showing until transaction completes
          labelOptions: [
            {
              label: strings('perps.deposit.in_progress'),
              isBold: true,
            },
            {
              label: strings('perps.deposit.processing_message'),
              isBold: false,
            },
          ],
        });
        // Don't clear the result for pending - it will be cleared by the controller
      } else if (lastDepositResult.success) {
        // Show success toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: strings('perps.deposit.success_toast'),
              isBold: true,
            },
            {
              label: strings('perps.deposit.success_message'),
              isBold: false,
            },
          ],
        });

        // Clear the result after showing toast
        setTimeout(() => {
          clearDepositResult();
          hasProcessedResultRef.current = null;
        }, 500);
      } else {
        // Show error toast (but not for 'pending')
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Danger,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: strings('perps.deposit.error_toast'),
              isBold: true,
            },
            {
              label:
                lastDepositResult.error ||
                strings('perps.deposit.error_generic'),
              isBold: false,
            },
          ],
        });

        // Clear the result after showing toast
        setTimeout(() => {
          clearDepositResult();
          hasProcessedResultRef.current = null;
        }, 500);
      }
    }
  }, [lastDepositResult, toastRef, clearDepositResult]);

  return { depositInProgress };
};
