import { ErrorCode, HardwareWalletError } from '@metamask/hw-wallet-sdk';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../Engine';
import { isDisconnectError } from '../Ledger/ledgerErrors';

function getTransactions(): TransactionMeta[] {
  return Engine.context.TransactionController.state.transactions ?? [];
}

const SUBMITTED_OR_LATER_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.submitted,
  TransactionStatus.confirmed,
]);

function hasSubmittedReplacementTransaction(
  originalTransactionId: string,
): boolean {
  const transactions = getTransactions();
  const original = transactions.find((tx) => tx.id === originalTransactionId);
  if (!original) {
    return false;
  }

  return transactions.some(
    (tx) =>
      tx.id !== originalTransactionId &&
      (tx.type === TransactionType.retry ||
        tx.type === TransactionType.cancel) &&
      SUBMITTED_OR_LATER_STATUSES.has(tx.status) &&
      tx.txParams?.nonce === original.txParams?.nonce &&
      tx.chainId === original.chainId,
  );
}

function getErrorCause(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return error.cause;
  }
  return undefined;
}

/**
 * True for a Ledger BLE drop (`DisconnectedDevice`), including when the
 * keyring wraps it as `HardwareWalletError` Unknown.
 */
function isEphemeralDisconnectError(error: unknown): boolean {
  if (isDisconnectError(error) || isDisconnectError(getErrorCause(error))) {
    return true;
  }

  if (!HardwareWalletError.isHardwareWalletError(error)) {
    return false;
  }

  if (error.code === ErrorCode.DeviceDisconnected) {
    return true;
  }

  // handleLedgerTransportError copies DisconnectedDevice onto message
  // and sets code Unknown.
  return (
    error.code === ErrorCode.Unknown &&
    isDisconnectError({ name: error.message })
  );
}

/**
 * `onError` for Ledger speed-up/cancel.
 *
 * After confirm, Ledger BLE often drops (`DisconnectedDevice`). The keyring
 * wraps that as `HardwareWalletError` Unknown, so `execute()` rejects even
 * when a `retry`/`cancel` with the original nonce is already submitted
 * (or confirmed). Skip the Unknown sheet only for that disconnect.
 * Unapproved/signed/failed replacements are not proof of success —
 * TransactionController adds the replacement before signing finishes.
 * Real device errors still show.
 */
export function skipHardwareWalletErrorIfReplacementSubmitted(
  originalTransactionId: string,
): (error: unknown) => boolean {
  return (error: unknown) =>
    isEphemeralDisconnectError(error) &&
    hasSubmittedReplacementTransaction(originalTransactionId);
}
