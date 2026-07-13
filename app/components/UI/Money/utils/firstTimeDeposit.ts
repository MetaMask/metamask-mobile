import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
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

/**
 * Returns true if confirming `tx` should trigger the first-time deposit full-page
 * animation takeover. We use this both to decide whether to show the first
 * deposit animation, and to whether to hide the successful deposit toast.
 **/
export function shouldShowMoneyFirstTimeDepositAnimation(
  state: RootState,
  tx: TransactionMeta,
): boolean {
  return (
    isMoneyDepositTx(tx) &&
    selectMoneyFirstTimeDepositAnimationEnabledFlag(state) &&
    !hasPriorMoneyDeposit(state, tx.id)
  );
}
