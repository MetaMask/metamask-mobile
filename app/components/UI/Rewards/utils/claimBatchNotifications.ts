import {
  removeNotificationById,
  showSimpleNotification,
} from '../../../../actions/notification';
import Engine from '../../../../core/Engine';
import { registerNotificationSkipPredicate } from '../../../../core/notificationSkipPredicates';

/**
 * NotificationManager shows "Transaction submitted" immediately, then queues
 * "Transaction complete" or the failure banner this long after the chain
 * result. The rewards line takes that second slot.
 */
const TRADE_SETTLED_BANNER_DELAY_MS = 2000;

export const CLAIM_REWARDS_IN_PLACE_OF_SETTLED_BANNER_MS =
  TRADE_SETTLED_BANNER_DELAY_MS;

/** Same hold as the wallet's settled-transaction banner. */
export const CLAIM_REWARDS_NOTIFICATION_MS = 5000;

const REPLACED_CLAIM_BATCH_LIMIT = 50;

const replacedClaimBatchIds = new Set<string>();

/** Forgets claim batches whose settled wallet banner was replaced. */
export function clearReplacedClaimBatches(): void {
  replacedClaimBatchIds.clear();
}

export function claimRewardsNotification(
  id: string,
  title: string,
  status: 'success' | 'error' = 'success',
) {
  return showSimpleNotification({
    id,
    autodismiss: CLAIM_REWARDS_NOTIFICATION_MS,
    title,
    description: '',
    status,
  });
}

/** True once this claim's settled wallet banner should be skipped. */
export function isReplacedClaimBatch(
  transactionMeta: { batchId?: string } | undefined,
): boolean {
  const batchId = transactionMeta?.batchId;
  return (
    typeof batchId === 'string' &&
    replacedClaimBatchIds.has(batchId.toLowerCase())
  );
}

function rememberReplacedClaimBatch(batchId: string): void {
  const key = batchId.toLowerCase();
  replacedClaimBatchIds.delete(key);
  replacedClaimBatchIds.add(key);
  while (replacedClaimBatchIds.size > REPLACED_CLAIM_BATCH_LIMIT) {
    const oldest = replacedClaimBatchIds.values().next().value;
    if (oldest === undefined) {
      return;
    }
    replacedClaimBatchIds.delete(oldest);
  }
}

/**
 * Stops the wallet from queueing "Transaction complete" or its failure
 * banner for this claim. "Transaction submitted" has already been shown.
 */
export function suppressSettledClaimBatchBanner(batchId: string): void {
  registerNotificationSkipPredicate(isReplacedClaimBatch);
  rememberReplacedClaimBatch(batchId);
}

/** Drops a still-visible submitted banner so the rewards line can show. */
export function clearSettledClaimBatchBanners(batchId: string) {
  const key = batchId.toLowerCase();
  return Engine.context.TransactionController.state.transactions
    .filter((transaction) => transaction.batchId?.toLowerCase() === key)
    .map((transaction) => removeNotificationById(transaction.id));
}

/**
 * Shows the rewards line when the wallet would have shown its settled
 * banner. Call `suppressSettledClaimBatchBanner` first.
 */
export function queueClaimRewardsInPlaceOfSettledBanner(
  show: () => void,
  schedule: (
    callback: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout> = (callback, delayMs) =>
    setTimeout(callback, delayMs),
): ReturnType<typeof setTimeout> {
  return schedule(show, CLAIM_REWARDS_IN_PLACE_OF_SETTLED_BANNER_MS);
}
