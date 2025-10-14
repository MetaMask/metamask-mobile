import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import usePerpsToasts from './usePerpsToasts';

/**
 * Hook to monitor deposit status and show appropriate toasts
 * Handles both deposit initiated and deposit complete states
 */
export const usePerpsDepositStatus = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const lastDepositResult = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositResult ?? null,
  );

  const clearDepositResult = useCallback(() => {
    const controller = Engine.context.PerpsController;
    controller?.clearDepositResult();
  }, []);

  // Track if we've already processed the current result
  const hasProcessedResultRef = useRef<string | null>(null);

  useEffect(() => {
    // Create a unique identifier for this result to prevent duplicate toasts
    const resultId = lastDepositResult
      ? `${lastDepositResult.success}-${
          lastDepositResult.txHash || lastDepositResult.error
        }`
      : null;

    // Skip if we've already processed this result or if there's no result
    if (
      !lastDepositResult ||
      (resultId && resultId === hasProcessedResultRef.current)
    ) {
      return;
    }

    // Mark this result as processed
    if (resultId) {
      hasProcessedResultRef.current = resultId;
    }

    DevLogger.log('usePerpsDepositStatus: Processing result', {
      lastDepositResult,
      resultId,
    });

    let timeoutId: NodeJS.Timeout | null = null;

    if (lastDepositResult.success) {
      // Show deposit success toast
      showToast(
        PerpsToastOptions.accountManagement.deposit.success(
          lastDepositResult.txHash || '',
        ),
      );

      // Clear the result after showing toast
      timeoutId = setTimeout(() => {
        clearDepositResult();
        hasProcessedResultRef.current = null;
      }, 500);
    } else {
      // Show error toast
      showToast(PerpsToastOptions.accountManagement.deposit.error);

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
  }, [
    lastDepositResult,
    clearDepositResult,
    showToast,
    PerpsToastOptions.accountManagement.deposit,
  ]);

  return { depositInProgress: !!lastDepositResult };
};
