import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';

/**
 * Whether a transaction is a perps deposit-and-order that the user has not
 * confirmed yet.
 *
 * Perps prepares this transaction before the user commits to a trade — both when
 * they tap Long/Short and, on the market screen, ahead of the tap — so an
 * unapproved one is scaffolding for the trade form rather than something the user
 * did. Activity surfaces must hide it, or a prepared trade that is never placed
 * shows up as a pending transaction.
 */
export function isUnconfirmedPerpsDepositOrder(
  transaction: Pick<TransactionMeta, 'type' | 'status'>,
): boolean {
  return (
    transaction.type === TransactionType.perpsDepositAndOrder &&
    transaction.status === TransactionStatus.unapproved
  );
}
