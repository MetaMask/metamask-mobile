import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { HardwareWalletsSwapsStepKind } from '../HardwareWalletsSwaps.state';
import { isValidHexAddress } from '../../../../../util/address';
import {
  ALL_BATCH_TYPES,
  APPROVAL_TYPES,
  FAILED_OR_REJECTED_STATUSES,
  NON_TERMINAL_CANCEL_STATUSES,
  POST_SIGN_BATCH_STATUSES,
} from './constants';
import { getTransactions } from './utils';

/** Type guard: true when the tx type belongs to the given tracked-types set. */
export function isBatchTransactionType(
  txType: TransactionMeta['type'],
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): txType is TransactionType {
  return Boolean(txType && trackedTypes.has(txType));
}

/**
 * Normalizes an address for case-insensitive comparison or storage.
 *
 * EVM hex addresses are lower-cased (case-insensitive by spec).
 * Non-EVM addresses (Solana base58, Bitcoin base58check, bech32, etc.)
 * are returned as-is because their encodings are case-sensitive —
 * lower-casing would corrupt them and cause `matchesTx` to silently
 * fail to match transactions from the active hardware wallet.
 */
export function normalizeAddress(
  address: string | undefined,
): string | undefined {
  if (!address) return undefined;
  return isValidHexAddress(address) ? address.toLowerCase() : address;
}

/**
 * True when a tx belongs to the active hardware wallet and is part of a
 * tracked batch (same `from`, tracked type).
 */
export function matchesTx(
  transactionMeta: TransactionMeta,
  targetFrom: string,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): boolean {
  const normalizedFrom = normalizeAddress(transactionMeta.txParams.from);
  if (normalizedFrom !== targetFrom) return false;
  return isBatchTransactionType(transactionMeta.type, trackedTypes);
}

/** Maps a batch type to its swap-flow step kind (approval vs. transaction). Bridge-only. */
export function getStepKind(
  txType: TransactionType,
): HardwareWalletsSwapsStepKind {
  return APPROVAL_TYPES.has(txType)
    ? HardwareWalletsSwapsStepKind.Approval
    : HardwareWalletsSwapsStepKind.Transaction;
}

/**
 * Send-mode step-kind resolver: a Sendbundle's two txs share one type, so
 * distinguish by `txParams.to === gasTokenAddress` → FeeTransfer, else Transaction.
 */
export function getSendStepKind(
  transactionMeta: TransactionMeta,
  normalizedGasTokenAddress: string | undefined,
): HardwareWalletsSwapsStepKind {
  if (normalizedGasTokenAddress) {
    const normalizedTo = normalizeAddress(transactionMeta.txParams.to);
    if (normalizedTo && normalizedTo === normalizedGasTokenAddress) {
      return HardwareWalletsSwapsStepKind.FeeTransfer;
    }
  }
  return HardwareWalletsSwapsStepKind.Transaction;
}

/** Transaction has been signed (or has progressed past signing). */
export function isPostSignBatchTransaction(tx: TransactionMeta): boolean {
  return POST_SIGN_BATCH_STATUSES.has(tx.status);
}

/** Transaction is in a non-terminal, pre-broadcast state — still cancellable. */
export function isPendingBatchTransaction(tx: TransactionMeta): boolean {
  return NON_TERMINAL_CANCEL_STATUSES.has(tx.status);
}

/** Transaction has failed or been rejected. */
export function isFailedOrRejectedBatchTransaction(
  tx: TransactionMeta,
): boolean {
  return FAILED_OR_REJECTED_STATUSES.has(tx.status);
}

/**
 * Checks whether any tracked pending-sign transaction from the given address in
 * the given batch has already reached a post-sign status (signed/submitted/
 * confirmed) — used to detect and ignore "late rejections" that arrive after
 * signing already succeeded.
 */
export function hasSignedTrackedBatchFromAddress(
  batchId: string,
  address: string,
  pendingSignTxIds: ReadonlySet<string>,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): boolean {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return false;
  return getTransactions().some(
    (tx) =>
      pendingSignTxIds.has(tx.id) &&
      tx.batchId === batchId &&
      matchesTx(tx, normalizedAddress, trackedTypes) &&
      isPostSignBatchTransaction(tx),
  );
}
