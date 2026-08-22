import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  isUserCancellation,
} from '../../../../core/HardwareWallet';
import Engine from '../../../../core/Engine';
import { getDeviceIdForAddress } from '../../../../core/HardwareWallet/helpers';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

interface UseLedgerConfirmOptions {
  fromAddress: string;
  onReject: () => void;
  onTransactionConfirm: (opts?: {
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  executeApproval: () => Promise<void>;
  isTransactionReq: boolean;
  requiredTransactionCount?: number;
  transactionId?: string;
}

/**
 * Encapsulates the Ledger-specific confirmation flow:
 * device readiness check, awaiting on-device confirmation,
 * signing dispatch, and error / cancellation handling.
 */
export function useLedgerConfirm({
  fromAddress,
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
  requiredTransactionCount,
  transactionId,
}: UseLedgerConfirmOptions) {
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showHardwareWalletError,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
  } = useHardwareWallet();

  const hasRejectedRef = useRef(false);

  const onConfirm = useCallback(async () => {
    hasRejectedRef.current = false;

    const rejectOnce = () => {
      if (hasRejectedRef.current) return;
      hasRejectedRef.current = true;
      onReject();
    };

    if (!fromAddress) {
      rejectOnce();
      return;
    }

    setPendingOperationAddress(fromAddress);
    let stopWatchingSignedTransactions = () => undefined;
    let hasHiddenAwaitingConfirmation = false;
    const hideAwaitingConfirmationOnce = () => {
      if (hasHiddenAwaitingConfirmation) {
        return;
      }

      hasHiddenAwaitingConfirmation = true;
      hideAwaitingConfirmation();
    };

    try {
      const deviceId = await getDeviceIdForAddress(fromAddress);
      const isReady = await ensureDeviceReady(deviceId);

      if (!isReady) {
        rejectOnce();
        return;
      }

      const operationType = isTransactionReq ? 'transaction' : 'message';
      showAwaitingConfirmation(operationType, () => {
        rejectOnce();
      });

      if (requiredTransactionCount && transactionId) {
        const signedHandler = Engine.controllerMessenger.subscribeOnceIf(
          'TransactionController:transactionStatusUpdated',
          () => {
            hideAwaitingConfirmationOnce();
          },
          ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
            const transactions =
              Engine.context.TransactionController.state.transactions;
            const requiredTransactionIds =
              transactions.find(
                (transaction) => transaction.id === transactionId,
              )?.requiredTransactionIds ?? [];

            if (!requiredTransactionIds.includes(transactionMeta.id)) {
              return false;
            }

            if (requiredTransactionIds.length < requiredTransactionCount) {
              return false;
            }

            return requiredTransactionIds.every((requiredTransactionId) => {
              const status = transactions.find(
                (transaction) => transaction.id === requiredTransactionId,
              )?.status;

              return (
                status === TransactionStatus.signed ||
                status === TransactionStatus.submitted ||
                status === TransactionStatus.confirmed
              );
            });
          },
        );

        stopWatchingSignedTransactions = () => {
          Engine.controllerMessenger.tryUnsubscribe(
            'TransactionController:transactionStatusUpdated',
            signedHandler,
          );
        };
      }

      if (isTransactionReq) {
        await onTransactionConfirm({
          onError: (err) => {
            throw err;
          },
        });
      } else {
        await executeApproval();
      }

      hideAwaitingConfirmationOnce();
    } catch (err) {
      hideAwaitingConfirmationOnce();

      if (!hasRejectedRef.current && !isUserCancellation(err)) {
        showHardwareWalletError(err);
      }

      rejectOnce();
    } finally {
      stopWatchingSignedTransactions();
      setPendingOperationAddress(null);
    }
  }, [
    onReject,
    isTransactionReq,
    onTransactionConfirm,
    executeApproval,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    setPendingOperationAddress,
    fromAddress,
    requiredTransactionCount,
    transactionId,
  ]);

  return { onConfirm };
}
