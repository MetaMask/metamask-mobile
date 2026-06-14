import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { registerNotificationSkipPredicate } from '../../../../core/notificationSkipPredicates';
import { getIsBridgeTransaction } from './transaction';

const MAX_TRACKED_TRANSACTION_IDS = 50;
const trackedTransactionIds = new Set<string>();

let visibleSurfaceCount = 0;
let pendingSubmissions = 0;
let isNotificationSkipPredicateRegistered = false;

function isPostTradeNotificationTransaction(
  transactionMeta: TransactionMeta | undefined,
): boolean {
  if (visibleSurfaceCount === 0) {
    return false;
  }

  if (transactionMeta?.id && trackedTransactionIds.has(transactionMeta.id)) {
    return true;
  }

  if (!transactionMeta || pendingSubmissions === 0) {
    return false;
  }

  return (
    getIsBridgeTransaction(transactionMeta) ||
    transactionMeta.type === TransactionType.batch
  );
}

function ensureNotificationSkipPredicateRegistered(): void {
  if (isNotificationSkipPredicateRegistered) {
    return;
  }

  registerNotificationSkipPredicate(isPostTradeNotificationTransaction);
  isNotificationSkipPredicateRegistered = true;
}

function trackPostTradeTransaction(txMetaId: string): void {
  trackedTransactionIds.delete(txMetaId);
  trackedTransactionIds.add(txMetaId);

  if (trackedTransactionIds.size > MAX_TRACKED_TRANSACTION_IDS) {
    const oldest = trackedTransactionIds.values().next().value;
    if (oldest !== undefined) {
      trackedTransactionIds.delete(oldest);
    }
  }
}

export function showPostTradeNotificationSurface(): void {
  ensureNotificationSkipPredicateRegistered();
  visibleSurfaceCount += 1;
}

export function hidePostTradeNotificationSurface(): void {
  visibleSurfaceCount = Math.max(0, visibleSurfaceCount - 1);
}

export async function withPostTradeNotificationSuppression<
  SubmittedTransaction extends { id?: unknown } | undefined,
>(
  submitTransaction: () => Promise<SubmittedTransaction>,
): Promise<SubmittedTransaction> {
  ensureNotificationSkipPredicateRegistered();
  pendingSubmissions += 1;

  try {
    const submittedTransaction = await submitTransaction();
    if (typeof submittedTransaction?.id === 'string') {
      trackPostTradeTransaction(submittedTransaction.id);
    }

    return submittedTransaction;
  } finally {
    pendingSubmissions = Math.max(0, pendingSubmissions - 1);
  }
}
