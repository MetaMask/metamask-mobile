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
 * Resolves on `approved`, not on-chain confirmation. MM Pay runs the whole
 * top-up route inside the publish hook, and the parent transaction only
 * becomes `submitted`/`confirmed` once that route finishes. How long that
 * takes depends on the route MM Pay picks:
 * - Same-chain swap or transfer: seconds (the source batch confirms on-chain).
 * - Bridge: usually minutes (Relay is polled until the destination fills).
 * - Fiat on-ramp: 10+ minutes (the ramp order is polled, then bridged). By
 * `approved` the user has already paid the provider, because confirm opens
 * the ramp widget first when there is no order yet.
 *
 * Blocking checkout for that long is not needed: the subscription server
 * creates the subscription in a provisional status, re-checks the Money
 * Account balance within a grace period, and cancels the subscription if the
 * funds never arrive. The client only needs the user's commitment to fund.
 *
 * As a result:
 * - Rejection, or a failure before approval, rejects the promise.
 * - Failures after approval (signing, a failed/expired/timed-out fiat order,
 * a bridge failure, a vault deposit error) are not reported here; the
 * server cancels the provisional subscription instead.
 * - MM Pay steps that run in app memory (fiat order polling, a non-atomic
 * bridge's vault deposit) stop if the app is killed, leaving funds in the
 * paying account rather than the Money Account.
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
