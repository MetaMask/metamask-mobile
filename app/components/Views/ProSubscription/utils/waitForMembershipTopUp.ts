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

/**
 * Statuses the parent top-up can only reach after the user approved it.
 * Statuses past `approved` are included in case that update is missed.
 */
const APPROVED_STATUSES: readonly TransactionStatus[] = [
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
  TransactionStatus.confirmed,
];

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
 * Waits for the user to approve a membership-subscription top-up batch.
 *
 * Resolves on approval rather than on-chain confirmation. Depending on the
 * route MM Pay picks, funds can take seconds (same-chain swap/transfer),
 * minutes (bridge), or 10+ minutes (fiat on-ramp) to land in the Money
 * Account. The subscription server creates the subscription in a provisional
 * status and re-checks the Money Account balance within a grace period; if the
 * funds never arrive, it cancels the subscription. So the client only needs
 * the user's commitment to fund, not the settled funds.
 *
 * Callers should subscribe before `addTransactionBatch` so a fast approval or
 * rejection cannot race past the listener. Only transactions that match both
 * `batchId` and `TransactionType.membershipSubscription` are considered.
 *
 * @param batchId - Batch id of the membership top-up transaction.
 * @returns A promise that resolves once the top-up is approved, plus a cancel
 * that unsubscribes without settling the promise.
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
    const onStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!isMembershipTopUp(transactionMeta, batchId)) {
        return;
      }

      const { status } = transactionMeta;

      if (APPROVED_STATUSES.includes(status)) {
        if (settleOnce()) {
          resolve(transactionMeta);
        }
        return;
      }

      switch (status) {
        case TransactionStatus.rejected:
          if (settleOnce()) {
            reject(new Error(USER_REJECTED_TOP_UP_MESSAGE));
          }
          break;
        case TransactionStatus.failed:
        case TransactionStatus.dropped:
        case TransactionStatus.cancelled:
          if (settleOnce()) {
            reject(new Error(topUpFailureMessage(transactionMeta)));
          }
          break;
        default:
          break;
      }
    };

    stopListening = () => {
      Engine.controllerMessenger.unsubscribe(STATUS_UPDATED, onStatusUpdated);
    };

    Engine.controllerMessenger.subscribe(STATUS_UPDATED, onStatusUpdated);
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
