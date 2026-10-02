import {
  hasTransactionType,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';

const USER_REJECTED_TOP_UP_MESSAGE = 'User rejected the request';

const STATUS_UPDATED = 'TransactionController:transactionStatusUpdated';
const CONFIRMED = 'TransactionController:transactionConfirmed';

export interface WaitForMembershipTopUpResult {
  promise: Promise<TransactionMeta>;
  cancel: () => void;
}

function isMembershipTopUp(
  transactionMeta: TransactionMeta,
  batchId: Hex,
): boolean {
  return (
    transactionMeta.batchId === batchId &&
    hasTransactionType(transactionMeta, [
      TransactionType.membershipSubscription,
    ])
  );
}

function topUpFailureMessage(transactionMeta: TransactionMeta): string {
  return (
    transactionMeta.error?.message ??
    `Membership subscription top-up ${transactionMeta.status}`
  );
}

/**
 * Waits for a membership-subscription top-up batch to settle.
 *
 * Callers should subscribe before `addTransactionBatch` so a fast confirmed
 * or rejected event cannot race past the listener. Only transactions that
 * match both `batchId` and `TransactionType.membershipSubscription` are
 * considered.
 *
 * @param batchId - Batch id of the membership top-up transaction.
 * @returns A promise that resolves on confirmation, plus a cancel that
 * unsubscribes without settling the promise.
 */
export function waitForMembershipTopUp(
  batchId: Hex,
): WaitForMembershipTopUpResult {
  let settled = false;
  let stopListening: () => void = () => undefined;

  // First caller wins: later status events and cancel are ignored.
  const settleOnce = (): boolean => {
    if (settled) {
      return false;
    }
    settled = true;
    stopListening();
    return true;
  };

  const promise = new Promise<TransactionMeta>((resolve, reject) => {
    const resolveTopUp = (transactionMeta: TransactionMeta) => {
      if (
        isMembershipTopUp(transactionMeta, batchId) &&
        transactionMeta.status === TransactionStatus.confirmed &&
        settleOnce()
      ) {
        resolve(transactionMeta);
      }
    };

    const rejectTopUp = (error: Error) => {
      if (settleOnce()) {
        reject(error);
      }
    };

    const onStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!isMembershipTopUp(transactionMeta, batchId)) {
        return;
      }

      switch (transactionMeta.status) {
        case TransactionStatus.confirmed:
          resolveTopUp(transactionMeta);
          break;
        case TransactionStatus.rejected:
          rejectTopUp(new Error(USER_REJECTED_TOP_UP_MESSAGE));
          break;
        case TransactionStatus.failed:
        case TransactionStatus.dropped:
          rejectTopUp(new Error(topUpFailureMessage(transactionMeta)));
          break;
        default:
          break;
      }
    };

    const onConfirmed = (transactionMeta: TransactionMeta) => {
      resolveTopUp(transactionMeta);
    };

    stopListening = () => {
      Engine.controllerMessenger.unsubscribe(STATUS_UPDATED, onStatusUpdated);
      Engine.controllerMessenger.unsubscribe(CONFIRMED, onConfirmed);
    };

    Engine.controllerMessenger.subscribe(STATUS_UPDATED, onStatusUpdated);
    Engine.controllerMessenger.subscribe(CONFIRMED, onConfirmed);
  });

  // Keep rejections observable to `await promise`, but mark them handled so a
  // settle that races ahead of the await (e.g. reject during initiateDeposit)
  // does not surface as an unhandled rejection.
  promise.catch(() => undefined);

  return {
    promise,
    cancel: () => {
      settleOnce();
    },
  };
}
