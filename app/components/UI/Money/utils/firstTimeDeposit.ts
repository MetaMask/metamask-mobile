import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { type MoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import BigNumber from 'bignumber.js';
import { RootState } from '../../../../reducers';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import ReactQueryService from '../../../../core/ReactQueryService';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
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
 * Returns true if the primary money account's last-fetched balance is greater
 * than zero. Reads the cached balance, which at deposit-confirmation time
 * predates the deposit — so a restored, already-funded wallet counts as
 * having an existing balance.
 */
export function hasExistingMoneyBalance(state: RootState): boolean {
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  if (!primaryMoneyAccount) {
    return false;
  }

  const balance =
    ReactQueryService.queryClient.getQueryData<MoneyAccountBalanceResponse>([
      MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
      primaryMoneyAccount.address,
    ]);
  if (!balance?.totalBalance) {
    return false;
  }

  const totalBalance = new BigNumber(balance.totalBalance);
  return !totalBalance.isNaN() && totalBalance.isGreaterThan(0);
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
    !hasPriorMoneyDeposit(state, tx.id) &&
    !hasExistingMoneyBalance(state)
  );
}
