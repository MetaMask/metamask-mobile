import { useCallback, useContext, useEffect, useRef } from 'react';
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
import { useAppThemeFromContext } from '../../../../util/theme';

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
  const theme = useAppThemeFromContext();
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

  const showDepositErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Warning,
      iconColor: theme.colors.icon.default,
      backgroundColor: theme.colors.error.default,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('perps.deposit.error_toast'),
          isBold: true,
        },
        {
          label: '\n',
        },
        {
          label: strings('perps.deposit.error_generic'),
          isBold: false,
        },
      ],
    });
  }, [theme.colors.error.default, theme.colors.icon.default, toastRef]);

  // Clear stale results on mount
  useEffect(() => {
    // If there's a result on mount, it's stale from a previous session
    if (lastDepositResult) {
      DevLogger.log(
        'usePerpsDepositStatus: Clearing stale deposit result on mount',
      );
      clearDepositResult();
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally omitting dependencies

  // Log state changes for debugging
  useEffect(() => {
    DevLogger.log('usePerpsDepositStatus: State changed', {
      depositInProgress,
      lastDepositResult,
      hasToastContext: !!toastRef?.current,
    });
  }, [depositInProgress, lastDepositResult, toastRef]);

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

      DevLogger.log('usePerpsDepositStatus: Attempting to show deposit toast', {
        success: lastDepositResult.success,
        txHash: lastDepositResult.txHash,
        error: lastDepositResult.error,
        hasToastContext: !!toastRef?.current,
        toastRefPresent: !!toastRef,
        showToastPresent: !!toastRef?.current?.showToast,
      });

      let timeoutId: NodeJS.Timeout | null = null;

      if (!lastDepositResult.success) {
        // Show error toast
        showDepositErrorToast();

        // Clear the result after showing toast
        timeoutId = setTimeout(() => {
          clearDepositResult();
          hasProcessedResultRef.current = null;
        }, 500);
      }

      // Cleanup function to clear timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [lastDepositResult, toastRef, clearDepositResult, showDepositErrorToast]);

  return { depositInProgress };
};
