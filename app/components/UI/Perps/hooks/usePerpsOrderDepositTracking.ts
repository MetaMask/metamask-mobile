import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback, useContext } from 'react';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import usePerpsToasts from './usePerpsToasts';

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
export const usePerpsOrderDepositTracking = () => {
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { toastRef } = useContext(ToastContext);

  const showProgressToast = useCallback(
    (transactionId: string) => {
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
    [showToast, PerpsToastOptions],
  );

  // Callback to show toast when user confirms the deposit
  const handleDepositConfirm = useCallback(
    (transactionMeta: TransactionMeta, callback: () => void) => {
      if (
        transactionMeta.type !== TransactionType.perpsDepositAndOrder
      ) {
        return;
      }
      const transactionId = transactionMeta.id;
      showProgressToast(transactionId);

      // Handle failed transactions
      const handleTransactionFailed = ({
        transactionMeta: failedTransactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (
          failedTransactionMeta?.type === TransactionType.perpsDepositAndOrder
        ) {
          if (failedTransactionMeta.id === transactionId) {
            toastRef?.current?.closeToast();
            showToast(PerpsToastOptions.accountManagement.deposit.error);
          }
        }
      };

      const handleTransactionStatusUpdated = ({
        transactionMeta: updatedTransactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (
          updatedTransactionMeta.id === transactionId &&
          updatedTransactionMeta.status === TransactionStatus.confirmed
        ) {
          // Unmark active handler so usePerpsDepositStatus can handle it if needed

          toastRef?.current?.closeToast();
          callback?.();
        }
      };

      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionFailed',
        handleTransactionFailed,
      );
      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
    },
    [
      showToast,
      toastRef,
      showProgressToast,
      PerpsToastOptions.accountManagement.deposit,
    ],
  );

  return {
    handleDepositConfirm,
  };
};
