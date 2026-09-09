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
    deferNavigation?: boolean;
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  onSigningComplete?: () => void;
  executeApproval: () => Promise<void>;
  isTransactionReq: boolean;
  /** Parent transaction whose `requiredTransactionIds` are batch funding legs. */
  transactionId?: string;
}

function getTransactionControllerState() {
  return Engine.controllerMessenger.call('TransactionController:getState');
}

function getRequiredTransactionIds(transactionId: string): string[] {
  return (
    getTransactionControllerState().transactions.find(
      (transaction) => transaction.id === transactionId,
    )?.requiredTransactionIds ?? []
  );
}

/**
 * Pay submits one quote at a time, so legs of later quotes only appear in
 * `requiredTransactionIds` after earlier ones confirm.
 */
function getExpectedQuoteCount(transactionId: string): number {
  return (
    Engine.controllerMessenger.call('TransactionPayController:getState')
      .transactionData[transactionId]?.quotes?.length ?? 1
  );
}

function isSigned(status: TransactionStatus | undefined): boolean {
  return (
    status === TransactionStatus.signed ||
    status === TransactionStatus.submitted ||
    status === TransactionStatus.confirmed
  );
}

/**
 * Each quote adds either one plain transaction or one batch. Signing is done
 * once every expected quote has all of its legs present and signed.
 */
function haveRequiredTransactionsBeenSigned(transactionId: string): boolean {
  const { batchTransactionCounts, transactions } =
    getTransactionControllerState();
  const requiredTransactions = getRequiredTransactionIds(transactionId).map(
    (id) => transactions.find((transaction) => transaction.id === id),
  );

  if (requiredTransactions.some((transaction) => !transaction)) {
    return false;
  }

  const legsByGroup = new Map<string, TransactionMeta[]>();
  for (const transaction of requiredTransactions as TransactionMeta[]) {
    const group = transaction.batchId ?? transaction.id;
    legsByGroup.set(group, [...(legsByGroup.get(group) ?? []), transaction]);
  }

  if (legsByGroup.size < getExpectedQuoteCount(transactionId)) {
    return false;
  }

  return [...legsByGroup.entries()].every(([group, legs]) => {
    const expectedLegs = batchTransactionCounts[group] ?? legs.length;
    return (
      legs.length >= expectedLegs && legs.every((leg) => isSigned(leg.status))
    );
  });
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
  onSigningComplete,
  executeApproval,
  isTransactionReq,
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
    const shouldCompleteAfterSigning = Boolean(
      isTransactionReq && onSigningComplete && transactionId,
    );
    let stopWatchingSignedTransactions = () => undefined;
    let hasHiddenAwaitingConfirmation = false;
    let hasCompletedSigning = false;
    const hideAwaitingConfirmationOnce = () => {
      if (hasHiddenAwaitingConfirmation) {
        return;
      }

      hasHiddenAwaitingConfirmation = true;
      hideAwaitingConfirmation();
    };
    const completeSigningOnce = () => {
      if (hasHiddenAwaitingConfirmation) {
        return;
      }

      hasCompletedSigning = true;
      hideAwaitingConfirmationOnce();
      onSigningComplete?.();
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

      if (shouldCompleteAfterSigning && transactionId) {
        const signedHandler = Engine.controllerMessenger.subscribeOnceIf(
          'TransactionController:transactionStatusUpdated',
          () => {
            completeSigningOnce();
          },
          ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
            const requiredTransactionIds =
              getRequiredTransactionIds(transactionId);

            if (!requiredTransactionIds.includes(transactionMeta.id)) {
              return false;
            }

            return haveRequiredTransactionsBeenSigned(transactionId);
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
          ...(shouldCompleteAfterSigning ? { deferNavigation: true } : {}),
          onError: (err) => {
            throw err;
          },
        });
      } else {
        await executeApproval();
      }

      if (shouldCompleteAfterSigning) {
        completeSigningOnce();
      } else {
        hideAwaitingConfirmationOnce();
      }
    } catch (err) {
      hideAwaitingConfirmationOnce();

      // Signing is done and the user has moved on; a later transaction
      // failure is not a device error and must not navigate them back.
      if (hasCompletedSigning) {
        return;
      }

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
    onSigningComplete,
    executeApproval,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    setPendingOperationAddress,
    fromAddress,
    transactionId,
  ]);

  return { onConfirm };
}
