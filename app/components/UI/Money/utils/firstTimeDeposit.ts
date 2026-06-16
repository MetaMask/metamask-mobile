import { RootState } from '../../../../reducers';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { isMoneyDepositTx } from './moneyTransactionGuards';

/**
 * Returns true if the wallet has any prior self-initiated Money deposit
 * transactions, excluding the transaction with `currentTxId`.
 *
 * "Prior" includes any status (submitted, failed, confirmed) — a failed
 * first attempt burns the animation.
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
    (tx) => tx.id !== currentTxId && isMoneyDepositTx(tx),
  );
}
