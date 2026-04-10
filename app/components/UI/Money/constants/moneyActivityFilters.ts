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

export function isMoneyActivityTransaction(tx: TransactionMeta): boolean {
  const t = tx.type;
  if (!t) {
    return false;
  }
  if (t === TransactionType.swap) {
    return true;
  }
  return isMoneyActivityDeposit(tx) || isMoneyActivityTransfer(tx);
}

/**
 * YYYY-MM-DD in UTC, for grouping list sections.
 */
export function getMoneyActivityDateKeyUtc(tx: TransactionMeta): string {
  return new Date(tx.time).toISOString().slice(0, 10);
}
