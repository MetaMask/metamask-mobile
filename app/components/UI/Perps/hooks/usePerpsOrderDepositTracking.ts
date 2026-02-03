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

/** Delay (ms) before showing the "Deposit taking longer than usual" toast */
const DEPOSIT_TAKING_LONGER_TOAST_DELAY_MS = 15000;

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
      let cancelTradeRequested = false;
      showProgressToast(transactionId);

      const takingLongerToastOptions =
        PerpsToastOptions.accountManagement.deposit.takingLonger;
      const cancelTradeOnPress = () => {
        cancelTradeRequested = true;
        // Replace current toast with "Trade canceled" (don't close first to avoid race)
        showToast(PerpsToastOptions.accountManagement.deposit.tradeCanceled);
      };
      const depositLongerTimeoutId = setTimeout(() => {
        const baseClose = takingLongerToastOptions.closeButtonOptions;
        showToast({
          ...takingLongerToastOptions,
          closeButtonOptions: baseClose
            ? { ...baseClose, onPress: cancelTradeOnPress }
            : undefined,
        } as Parameters<typeof showToast>[0]);
      }, DEPOSIT_TAKING_LONGER_TOAST_DELAY_MS);

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
            clearTimeout(depositLongerTimeoutId);
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
          clearTimeout(depositLongerTimeoutId);
          toastRef?.current?.closeToast();
          if (!cancelTradeRequested) {
            callback?.();
          }
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
