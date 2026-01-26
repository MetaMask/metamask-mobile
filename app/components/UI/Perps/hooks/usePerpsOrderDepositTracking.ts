import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback, useContext, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import usePerpsToasts from './usePerpsToasts';

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
  const hasShownDepositToastRef = useRef<string | null>(null);

  // Keep callback ref up to date
  const onDepositCompleteRef = useRef<() => void>(onDepositComplete);
  useEffect(() => {
    onDepositCompleteRef.current = onDepositComplete;
  }, [onDepositComplete]);

  const showProgressToastIfNeeded = useCallback(
    (transactionId: string) => {
      if (hasShownDepositToastRef.current === transactionId) {
        return;
      }
      hasShownDepositToastRef.current = transactionId;
      expectingDepositRef.current = true;
      prevAvailableBalanceRef.current =
        account?.availableBalance?.toString() || '0';
      getStreamManagerInstance().setActiveDepositHandler(true);

      showToast({
        ...PerpsToastOptions.accountManagement.deposit.inProgress(
          0,
          transactionId,
        ),
        labelOptions: [
          {
            label: strings('perps.deposit.depositing_your_funds'),
            isBold: true,
          },
        ],
        hasNoTimeout: true,
      });
    },
    [showToast, PerpsToastOptions, account?.availableBalance],
  );

  // Callback to show toast when user confirms the deposit
  const handleDepositConfirm = useCallback(
    (transactionMeta: TransactionMeta) => {
      if (transactionMeta.type !== TransactionType.perpsDeposit) {
        return;
      }
      showProgressToastIfNeeded(transactionMeta.id);
    },
    [showProgressToastIfNeeded],
  );

  // Extract primitive values from activeTransactionMeta to avoid re-renders
  // when the object reference changes but the data is the same
  const activeTransactionId = activeTransactionMeta?.id;
  const activeTransactionType = activeTransactionMeta?.type;
  const activeTransactionStatus = activeTransactionMeta?.status;

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

        // Mark that we're actively handling deposit toasts
        // This prevents usePerpsDepositStatus from showing duplicate toasts
        getStreamManagerInstance().setActiveDepositHandler(true);

        // Set up deposit tracking
        expectingDepositRef.current = true;
        prevAvailableBalanceRef.current =
          account?.availableBalance?.toString() || '0';

        showProgressToastIfNeeded(transactionId);
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
          // Unmark active handler so usePerpsDepositStatus can handle it if needed
          getStreamManagerInstance().setActiveDepositHandler(false);
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
      activeTransactionType === TransactionType.perpsDeposit &&
      activeTransactionStatus === TransactionStatus.approved &&
      activeTransactionId &&
      hasShownDepositToastRef.current !== activeTransactionId
    ) {
      showProgressToastIfNeeded(activeTransactionId);
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
      // Clean up: unmark active handler so usePerpsDepositStatus can show toast
      // if user navigates away and deposit completes later
      getStreamManagerInstance().setActiveDepositHandler(false);
    };
  }, [
    activeTransactionId,
    activeTransactionStatus,
    activeTransactionType,
    showProgressToastIfNeeded,
    account?.availableBalance,
    toastRef,
    showToast,
    PerpsToastOptions,
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
      toastRef?.current?.closeToast();

      showToast({
        ...PerpsToastOptions.accountManagement.deposit.success(
          account.availableBalance?.toString(),
        ),
        labelOptions: [
          {
            label: strings('perps.deposit.your_funds_have_arrived'),
            isBold: true,
          },
        ],
      });

      expectingDepositRef.current = false;
      prevAvailableBalanceRef.current =
        account.availableBalance?.toString() || '0';

      getStreamManagerInstance().setActiveDepositHandler(false);
      hasShownDepositToastRef.current = null;

      onDepositCompleteRef.current();
    }
  }, [account, showToast, PerpsToastOptions, toastRef]);

  return {
    handleDepositConfirm,
  };
};
