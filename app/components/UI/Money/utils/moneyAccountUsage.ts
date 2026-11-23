import { isObject } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

const isMoneyTransaction = (tx: unknown, type: TransactionType): boolean =>
  isObject(tx) && hasTransactionType(tx as TransactionMeta, [type]);

/**
 * True when a persisted transaction is a Money deposit, top-level or nested in
 * a batch.
 */
export const isMoneyDepositTransaction = (tx: unknown): boolean =>
  isMoneyTransaction(tx, TransactionType.moneyAccountDeposit);

/**
 * True when a persisted transaction is a Money withdrawal, top-level or nested
 * in a batch.
 */
export const isMoneyWithdrawTransaction = (tx: unknown): boolean =>
  isMoneyTransaction(tx, TransactionType.moneyAccountWithdraw);

/**
 * True when persisted transactions include a confirmed Money deposit or
 * withdrawal.
 */
export const hasConfirmedMoneyAccountTransaction = (
  transactions: unknown,
): boolean =>
  Array.isArray(transactions) &&
  transactions.some(
    (tx) =>
      isObject(tx) &&
      tx.status === TransactionStatus.confirmed &&
      (isMoneyDepositTransaction(tx) || isMoneyWithdrawTransaction(tx)),
  );

/**
 * True when a persisted Money balance is above zero.
 */
export const isPositiveMoneyBalance = (balance: unknown): boolean => {
  if (!isObject(balance) || typeof balance.value !== 'string') {
    return false;
  }

  const value = Number(balance.value.replace(/[^0-9.]/gu, ''));
  return Number.isFinite(value) && value > 0;
};
