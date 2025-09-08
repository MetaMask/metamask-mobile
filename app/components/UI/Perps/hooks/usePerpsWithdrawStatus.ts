import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import usePerpsToasts from './usePerpsToasts';

/**
 * Hook to monitor withdrawal status and show appropriate toasts
 * Handles both withdrawal initiated and withdrawal complete states
 */
export const usePerpsWithdrawStatus = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();

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
      showToast(PerpsToastOptions.withdrawal.withdrawalSuccess(amount, 'USDC'));

      // Clear the result after showing toast
      timeoutId = setTimeout(() => {
        clearWithdrawResult();
        hasProcessedResultRef.current = null;
      }, 500);
    } else {
      // Show error toast
      showToast(
        PerpsToastOptions.withdrawal.withdrawalFailed(lastWithdrawResult.error),
      );

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
  }, [
    lastWithdrawResult,
    clearWithdrawResult,
    showToast,
    PerpsToastOptions.withdrawal,
  ]);

  return { withdrawInProgress: !!lastWithdrawResult };
};
