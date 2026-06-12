import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

/**
 * Returns the first nested transaction matching a given TransactionType,
 * or undefined if none exists.
 */
export const nestedTxWithType = (
  transactionMeta: TransactionMeta,
  targetType: TransactionType,
) =>
  transactionMeta.nestedTransactions?.find(
    (nested) => nested.type === targetType,
  );

export const isMoneyDepositTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountDeposit ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountDeposit),
  );

export const isMoneyWithdrawTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountWithdraw ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountWithdraw),
  );

export const isMoneyAccountTx = (transactionMeta: TransactionMeta) =>
  isMoneyDepositTx(transactionMeta) || isMoneyWithdrawTx(transactionMeta);
