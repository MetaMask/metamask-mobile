import { isObject } from '@metamask/utils';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

/**
 * True when a persisted transaction is a Money deposit, top-level or nested in
 * a batch.
 */
export const isMoneyDepositTransaction = (tx: unknown): boolean => {
  if (!isObject(tx)) {
    return false;
  }

  if (tx.type === TransactionType.moneyAccountDeposit) {
    return true;
  }

  return (
    Array.isArray(tx.nestedTransactions) &&
    tx.nestedTransactions.some(
      (nested) =>
        isObject(nested) && nested.type === TransactionType.moneyAccountDeposit,
    )
  );
};

/**
 * True when persisted transactions include a confirmed Money deposit.
 */
export const hasConfirmedMoneyDeposit = (transactions: unknown): boolean => {
  if (!Array.isArray(transactions)) {
    return false;
  }

  return transactions.some(
    (tx) =>
      isObject(tx) &&
      tx.status === TransactionStatus.confirmed &&
      isMoneyDepositTransaction(tx),
  );
};

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
