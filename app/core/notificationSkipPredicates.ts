import type { TransactionMeta } from '@metamask/transaction-controller';

/**
 * A predicate that, given a transaction, returns `true` when the generic
 * transaction notification should be suppressed for it.
 */
export type NotificationSkipPredicate = (
  transactionMeta: TransactionMeta | undefined,
) => boolean;

/**
 * Registry of predicates that let feature code opt a transaction out of the
 * generic transaction notifications, without `NotificationManager` (core)
 * depending on any feature module.
 *
 * This lives in its own dependency-free module so feature code can register a
 * predicate without importing the heavy `NotificationManager` module (and its
 * transitive store/saga graph).
 */
const notificationSkipPredicates = new Set<NotificationSkipPredicate>();

/**
 * Register a predicate. Returns an unregister function.
 */
export function registerNotificationSkipPredicate(
  predicate: NotificationSkipPredicate,
): () => void {
  notificationSkipPredicates.add(predicate);
  return () => {
    notificationSkipPredicates.delete(predicate);
  };
}

export function clearNotificationSkipPredicates(): void {
  notificationSkipPredicates.clear();
}

export function getNotificationSkipPredicates(): NotificationSkipPredicate[] {
  return Array.from(notificationSkipPredicates);
}
