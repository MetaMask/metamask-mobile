import { TransactionStatus } from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { isMoneyDepositTx } from './moneyTransactionGuards';

/**
 * Returns true if the wallet has any prior self-initiated Money deposit
 * transactions, excluding the transaction with `currentTxId`.
 *
 * "Prior" includes any status except explicit user-abort (`rejected`) so a
 * backed-out confirmation does not burn the first-time animation.
 *
 * Reads state imperatively so it can be called inside a callback without
 * adding a useSelector subscription to the generic confirmations path.
 */
export function hasPriorMoneyDeposit(
  state: RootState,
  currentTxId: string,
): boolean {
  const transactions = selectNonReplacedTransactions(state);
  return transactions.some(
    (tx) =>
      tx.id !== currentTxId &&
      isMoneyDepositTx(tx) &&
      tx.status !== TransactionStatus.rejected &&
      tx.status !== TransactionStatus.unapproved &&
      tx.status !== TransactionStatus.confirmed,
  );
}
