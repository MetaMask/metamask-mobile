import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback, useContext, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import usePerpsToasts from './usePerpsToasts';
import {
  markTransactionSkipDefaultToast,
  unmarkTransactionSkipDefaultToast,
} from './usePerpsDepositStatus';

interface UsePerpsOrderDepositTrackingParams {
  /**
   * Callback to execute when deposit completes and funds arrive
   */
  onDepositComplete: () => void;
  /**
   * Active transaction metadata (optional)
   * Used to check for existing approved transactions on mount
   */
  activeTransactionMeta?: TransactionMeta | null;
}

/**
 * Hook to track deposit status for Perps order view
 *
 * This hook handles:
 * 1. Listening for deposit transaction approval and showing "depositing" toast
 * 2. Monitoring balance changes to detect when funds arrive
 * 3. Showing success toast when funds arrive
 * 4. Handling transaction failures
 * 5. Executing the order after funds arrive
 *
 * This ensures the order is placed automatically after the deposit completes.
 */
export const usePerpsOrderDepositTracking = ({
  onDepositComplete,
  activeTransactionMeta,
}: UsePerpsOrderDepositTrackingParams) => {
  const { account } = usePerpsLiveAccount();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { toastRef } = useContext(ToastContext);

  // Track deposit status and show toast until funds arrive
  const expectingDepositRef = useRef(false);
  const prevAvailableBalanceRef = useRef<string>('0');
  const depositTransactionIdRef = useRef<string | null>(null);
  const hasShownDepositToastRef = useRef<string | null>(null);

  // Keep callback ref up to date
  const onDepositCompleteRef = useRef<() => void>(onDepositComplete);
  useEffect(() => {
    onDepositCompleteRef.current = onDepositComplete;
  }, [onDepositComplete]);

  // Callback to show toast when user confirms the deposit
  const handleDepositConfirm = useCallback(
    (transactionMeta: TransactionMeta) => {
      // Only handle perps deposit transactions
      if (transactionMeta.type === TransactionType.perpsDeposit) {
        const transactionId = transactionMeta.id;

        // Prevent showing toast multiple times for the same transaction
        if (hasShownDepositToastRef.current === transactionId) {
          return;
        }

        // Mark this transaction to skip default toast from usePerpsDepositStatus
        // Do this immediately so usePerpsDepositStatus won't show its toast
        markTransactionSkipDefaultToast(transactionId);

        // Set up deposit tracking
        expectingDepositRef.current = true;
        prevAvailableBalanceRef.current =
          account?.availableBalance?.toString() || '0';
        depositTransactionIdRef.current = transactionId;
        hasShownDepositToastRef.current = transactionId;

        // Show "depositing your funds" toast that stays on screen
        showToast({
          ...PerpsToastOptions.accountManagement.deposit.inProgress(
            0,
            transactionId,
          ),
          labelOptions: [{ label: 'Depositing your funds', isBold: true }],
          hasNoTimeout: true, // Keep toast visible until funds arrive
        });
      }
    },
    [account?.availableBalance, showToast, PerpsToastOptions],
  );

  // Listen for deposit transaction submission (approved) and show toast
  useEffect(() => {
    // Listen for transaction approval (when user submits the deposit)
    const handleTransactionStatusUpdated = ({
      transactionMeta: updatedTransactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      // Only handle perps deposit transactions
      if (
        updatedTransactionMeta.type === TransactionType.perpsDeposit &&
        updatedTransactionMeta.status === TransactionStatus.approved
      ) {
        const transactionId = updatedTransactionMeta.id;

        // Prevent showing toast multiple times for the same transaction
        if (hasShownDepositToastRef.current === transactionId) {
          return;
        }

        // Mark this transaction to skip default toast from usePerpsDepositStatus
        // Do this immediately so usePerpsDepositStatus won't show its toast
        markTransactionSkipDefaultToast(transactionId);

        // Set up deposit tracking
        expectingDepositRef.current = true;
        prevAvailableBalanceRef.current =
          account?.availableBalance?.toString() || '0';
        depositTransactionIdRef.current = transactionId;
        hasShownDepositToastRef.current = transactionId;

        // Show "depositing your funds" toast that stays on screen
        showToast({
          ...PerpsToastOptions.accountManagement.deposit.inProgress(
            0,
            transactionId,
          ),
          labelOptions: [{ label: 'Depositing your funds', isBold: true }],
          hasNoTimeout: true, // Keep toast visible until funds arrive
        });
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    // Handle failed transactions
    const handleTransactionFailed = ({
      transactionMeta: failedTransactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (failedTransactionMeta?.type === TransactionType.perpsDeposit) {
        const transactionId = failedTransactionMeta.id;
        if (hasShownDepositToastRef.current === transactionId) {
          expectingDepositRef.current = false;
          // Unmark transaction ID so usePerpsDepositStatus can handle it if needed
          if (depositTransactionIdRef.current) {
            unmarkTransactionSkipDefaultToast(depositTransactionIdRef.current);
          }
          depositTransactionIdRef.current = null;
          hasShownDepositToastRef.current = null;
          // Close the depositing toast
          toastRef?.current?.closeToast();
          showToast(PerpsToastOptions.accountManagement.deposit.error);
        }
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      handleTransactionFailed,
    );

    // Check if there's already an approved transaction when effect runs
    if (
      activeTransactionMeta?.type === TransactionType.perpsDeposit &&
      activeTransactionMeta.status === TransactionStatus.approved &&
      hasShownDepositToastRef.current !== activeTransactionMeta.id
    ) {
      const transactionId = activeTransactionMeta.id;
      expectingDepositRef.current = true;
      prevAvailableBalanceRef.current =
        account?.availableBalance?.toString() || '0';
      depositTransactionIdRef.current = transactionId;
      hasShownDepositToastRef.current = transactionId;

      showToast({
        ...PerpsToastOptions.accountManagement.deposit.inProgress(
          0,
          transactionId,
        ),
        labelOptions: [{ label: 'Depositing your funds', isBold: true }],
        hasNoTimeout: true,
      });
    }

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionFailed',
        handleTransactionFailed,
      );
      // Clean up: unmark transaction ID so usePerpsDepositStatus can show toast
      // if user navigates away and deposit completes later
      if (depositTransactionIdRef.current) {
        unmarkTransactionSkipDefaultToast(depositTransactionIdRef.current);
      }
    };
  }, [
    activeTransactionMeta,
    account?.availableBalance,
    showToast,
    PerpsToastOptions,
    toastRef,
  ]);

  // Monitor balance changes to detect when funds arrive
  useEffect(() => {
    if (!expectingDepositRef.current || !account) {
      return;
    }

    const currentBalance = Number.parseFloat(
      account.availableBalance?.toString() || '0',
    );
    const previousBalance = Number.parseFloat(
      prevAvailableBalanceRef.current || '0',
    );

    // Check if balance increased (funds have arrived)
    if (currentBalance > previousBalance) {
      // Close the "depositing your funds" toast
      toastRef?.current?.closeToast();

      // Show "Your funds have arrived" toast
      showToast({
        ...PerpsToastOptions.accountManagement.deposit.success(
          account.availableBalance?.toString(),
        ),
        labelOptions: [{ label: 'Your funds have arrived', isBold: true }],
      });

      // Reset state
      expectingDepositRef.current = false;
      prevAvailableBalanceRef.current =
        account.availableBalance?.toString() || '0';
      if (depositTransactionIdRef.current) {
        unmarkTransactionSkipDefaultToast(depositTransactionIdRef.current);
      }
      depositTransactionIdRef.current = null;
      hasShownDepositToastRef.current = null;

      // Execute trade after funds arrive
      onDepositCompleteRef.current();
    }
  }, [account, showToast, PerpsToastOptions, toastRef]);

  return {
    handleDepositConfirm,
  };
};
