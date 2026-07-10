import { TransactionStatus } from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { isMoneyDepositTx } from './moneyTransactionGuards';

/**
 * Returns true if the wallet has any prior self-initiated Money deposit
 * transactions, excluding the transaction with `currentTxId`.
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
      tx.status === TransactionStatus.confirmed,
  );
}
