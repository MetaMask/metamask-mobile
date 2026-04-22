import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

export function isMoneyActivityDeposit(tx: TransactionMeta): boolean {
  const t = tx.type;
  return (
    t === TransactionType.incoming ||
    t === TransactionType.moneyAccountDeposit ||
    t === TransactionType.musdConversion
  );
}

export function isMoneyActivityTransfer(tx: TransactionMeta): boolean {
  const t = tx.type;
  return (
    t === TransactionType.moneyAccountWithdraw ||
    t === TransactionType.simpleSend
  );
}

/**
 * Money activity only lists types we can classify as deposit or transfer.
 * {@link TransactionType.swap} is excluded until direction (e.g. mUSD in vs out) is defined.
 */
export function isMoneyActivityTransaction(tx: TransactionMeta): boolean {
  return isMoneyActivityDeposit(tx) || isMoneyActivityTransfer(tx);
}

/**
 * YYYY-MM-DD in UTC, for grouping list sections.
 */
export function getMoneyActivityDateKeyUtc(tx: TransactionMeta): string {
  return new Date(tx.time).toISOString().slice(0, 10);
}
