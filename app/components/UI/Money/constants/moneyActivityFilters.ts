import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { isMusdToken } from '../../Earn/constants/musd';

const ERC20_TRANSFER_TYPES: TransactionType[] = [
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

/**
 * True when the transaction is an ERC-20 transfer of mUSD (any supported chain).
 * `transferInformation` is only populated by incoming-transaction polling; for
 * locally-signed sends we fall back to `txParams.to`, which for ERC-20 transfer
 * types is always the token contract.
 */
export function isMusdErc20Transfer(tx: TransactionMeta): boolean {
  if (!tx.type || !ERC20_TRANSFER_TYPES.includes(tx.type)) return false;
  return (
    isMusdToken(tx.transferInformation?.contractAddress) ||
    isMusdToken(tx.txParams?.to)
  );
}

export function isMoneyActivityDeposit(tx: TransactionMeta): boolean {
  const t = tx.type;
  if (
    t === TransactionType.incoming ||
    t === TransactionType.moneyAccountDeposit ||
    isMusdErc20Transfer(tx)
  ) {
    return true;
  }
  // EIP-7702 batch deposits: moneyAccountDeposit sits in nestedTransactions
  return (
    tx.nestedTransactions?.some(
      (nested) => nested.type === TransactionType.moneyAccountDeposit,
    ) ?? false
  );
}

export function isMoneyActivityTransfer(tx: TransactionMeta): boolean {
  const t = tx.type;
  if (
    t === TransactionType.moneyAccountWithdraw ||
    t === TransactionType.simpleSend
  ) {
    return true;
  }
  // EIP-7702 batch withdrawals: moneyAccountWithdraw sits in nestedTransactions
  return (
    tx.nestedTransactions?.some(
      (nested) => nested.type === TransactionType.moneyAccountWithdraw,
    ) ?? false
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
