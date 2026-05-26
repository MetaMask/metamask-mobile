import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { areAddressesEqual } from '../../../../util/address';
import { decodeTransferData } from '../../../../util/transactions';
import { isMusdTokenOnChain } from '../../Earn/constants/musd';

const ERC20_TRANSFER_TYPES: TransactionType[] = [
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

// `0x` + 8 hex chars selector + 64 hex chars (address) + 64 hex chars (uint256).
const ERC20_TRANSFER_CALLDATA_LENGTH = 138;
// `0x` + 8 hex chars selector + 3 × 64 hex chars (from, to, uint256).
const ERC20_TRANSFER_FROM_CALLDATA_LENGTH = 202;

/** Aggregator contract that receives mUSD for card spends. */
export const CARD_AGGREGATOR_ADDRESS =
  '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e';

/**
 * Extracts the call's recipient from ERC-20 `transfer`/`transferFrom` calldata.
 * For both types, `txParams.to` is the token contract, not the recipient — the
 * recipient must be decoded from the calldata. Returns `undefined` if the
 * calldata is missing or truncated; `decodeTransferData` does not throw on
 * short input, so length must be checked.
 */
export function getErc20TransferRecipient(
  tx: TransactionMeta,
): string | undefined {
  const data = tx.txParams?.data;
  if (!data) return undefined;
  try {
    if (
      tx.type === TransactionType.tokenMethodTransfer &&
      data.length >= ERC20_TRANSFER_CALLDATA_LENGTH
    ) {
      const [recipient] = decodeTransferData('transfer', data) as string[];
      return recipient;
    }
    if (
      tx.type === TransactionType.tokenMethodTransferFrom &&
      data.length >= ERC20_TRANSFER_FROM_CALLDATA_LENGTH
    ) {
      // transferFrom(address from, address to, uint256 amount) → recipient at [1].
      const [, recipient] = decodeTransferData(
        'transferFrom',
        data,
      ) as string[];
      return recipient;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * True when the transaction is a card spend — a simpleSend or ERC-20 transfer
 * whose recipient is the card aggregator contract. Today the user signs the
 * transfer themselves, so `transferFrom` is intentionally not included.
 */
export function isCardTransaction(tx: TransactionMeta): boolean {
  if (tx.type === TransactionType.simpleSend) {
    return areAddressesEqual(tx.txParams?.to ?? '', CARD_AGGREGATOR_ADDRESS);
  }
  if (tx.type === TransactionType.tokenMethodTransfer) {
    const recipient = getErc20TransferRecipient(tx);
    return (
      recipient !== undefined &&
      areAddressesEqual(recipient, CARD_AGGREGATOR_ADDRESS)
    );
  }
  return false;
}

/**
 * True when the transaction is an ERC-20 transfer of mUSD on a chain where
 * mUSD is actually deployed. `transferInformation` is only populated by
 * incoming-transaction polling; for locally-signed sends we fall back to
 * `txParams.to`, which for ERC-20 transfer types is always the token contract.
 */
export function isMusdErc20Transfer(tx: TransactionMeta): boolean {
  if (!tx.type || !ERC20_TRANSFER_TYPES.includes(tx.type)) return false;
  return (
    isMusdTokenOnChain(tx.transferInformation?.contractAddress, tx.chainId) ||
    isMusdTokenOnChain(tx.txParams?.to, tx.chainId)
  );
}

export function isMoneyActivityDeposit(tx: TransactionMeta): boolean {
  if (isCardTransaction(tx)) return false;
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
  if (isCardTransaction(tx)) return false;
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
