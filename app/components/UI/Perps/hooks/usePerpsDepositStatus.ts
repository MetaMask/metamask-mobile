import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

/**
 * Hook to monitor deposit status and show appropriate toasts
 * Handles the full deposit flow: in progress, success, and error states
 */
export const usePerpsDepositStatus = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Get live account data with fast updates
  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

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
  const hasShownInProgressToastRef = useRef<string | null>(null);

  // Track balance changes to detect when funds are available
  const prevAvailableBalanceRef = useRef<string>('0');
  const isWaitingForFundsRef = useRef<boolean>(false);
  const liveAccountRef = useRef(liveAccount);

  // Update the ref whenever liveAccount changes
  useEffect(() => {
    liveAccountRef.current = liveAccount;
  }, [liveAccount]);

  // Handle deposit error results (success is handled by balance monitoring)
  useEffect(() => {
    // Only handle error cases - success is handled by balance monitoring
    if (!lastDepositResult || lastDepositResult.success) {
      return;
    }

    // Create a unique identifier for this error result to prevent duplicate toasts
    const resultId = `error-${lastDepositResult.error}`;

    // Skip if we've already processed this error
    if (resultId === hasProcessedResultRef.current) {
      return;
    }

    // Mark this error as processed
    hasProcessedResultRef.current = resultId;

    DevLogger.log('usePerpsDepositStatus: Processing error result', {
      lastDepositResult,
      resultId,
    });

    // Show error toast
    showToast(PerpsToastOptions.accountManagement.deposit.error);

    // Stop waiting for funds since there was an error
    isWaitingForFundsRef.current = false;

    // Clear the result after showing toast
    const timeoutId = setTimeout(() => {
      clearDepositResult();
      hasProcessedResultRef.current = null;
      hasShownInProgressToastRef.current = null;
    }, 500);

    // Cleanup function to clear timeout if component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    lastDepositResult,
    clearDepositResult,
    showToast,
    PerpsToastOptions.accountManagement.deposit,
  ]);

  // Monitor transaction status changes to trigger in-progress toast and set up balance tracking
  useEffect(() => {
    const handlePerpsDepositTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type !== TransactionType.perpsDeposit) {
        return;
      }

      // When transaction is submitted/confirmed, trigger in-progress toast and start balance monitoring
      if (
        transactionMeta.status === TransactionStatus.submitted ||
        transactionMeta.status === TransactionStatus.confirmed
      ) {
        const toastId = `in-progress-${transactionMeta.id}`;

        // Only show if we haven't already shown this toast
        if (hasShownInProgressToastRef.current !== toastId) {
          DevLogger.log(
            'usePerpsDepositStatus: Transaction submitted/confirmed, triggering in-progress toast',
            {
              transactionId: transactionMeta.id,
              status: transactionMeta.status,
            },
          );

          // Show deposit in progress toast with ETA (1 minute)
          showToast(
            PerpsToastOptions.accountManagement.deposit.inProgress(
              60, // 1 minute ETA
              transactionMeta.id,
            ),
          );

          hasShownInProgressToastRef.current = toastId;
        }

        // Start monitoring balance changes to detect when funds are available
        isWaitingForFundsRef.current = true;
        prevAvailableBalanceRef.current =
          liveAccountRef.current?.availableBalance || '0';
      }

      // Handle transaction failure - stop waiting for funds
      if (transactionMeta.status === TransactionStatus.failed) {
        isWaitingForFundsRef.current = false;
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handlePerpsDepositTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handlePerpsDepositTransactionStatusUpdate,
      );
    };
  }, [showToast, PerpsToastOptions.accountManagement.deposit]);

  // Monitor balance changes to detect when funds are available
  useEffect(() => {
    if (!isWaitingForFundsRef.current || !liveAccount) {
      return;
    }

    const currentBalance = parseFloat(liveAccount.availableBalance || '0');
    const previousBalance = parseFloat(prevAvailableBalanceRef.current);

    // Check if balance increased (funds are now available)
    if (currentBalance > previousBalance) {
      DevLogger.log(
        'usePerpsDepositStatus: Balance increased, funds are now available',
        {
          previousBalance,
          currentBalance,
          increase: currentBalance - previousBalance,
        },
      );

      // Show success toast
      showToast(PerpsToastOptions.accountManagement.deposit.success(''));

      // Stop waiting for funds and clear state
      isWaitingForFundsRef.current = false;
      prevAvailableBalanceRef.current = liveAccount.availableBalance;

      // Clear any pending deposit result after a delay
      setTimeout(() => {
        clearDepositResult();
        hasProcessedResultRef.current = null;
        hasShownInProgressToastRef.current = null;
      }, 500);
    }
  }, [
    liveAccount,
    showToast,
    PerpsToastOptions.accountManagement.deposit,
    clearDepositResult,
  ]);

  return {
    depositInProgress: !!lastDepositResult || isWaitingForFundsRef.current,
  };
};
