import { StatusTypes } from '@metamask/bridge-controller';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Transaction } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';

/**
 * Maps intent status to transaction status for intent-based bridge/swap transactions.
 * Intent-based transactions use a different status lifecycle than regular transactions.
 *
 * @param intentStatus - Status from BridgeStatusController for intent quotes
 * @returns Status string compatible with StatusText component
 */
export const mapIntentStatusToTransactionStatus = (
  intentStatus: StatusTypes,
): 'confirmed' | 'submitted' | 'failed' | 'pending' => {
  switch (intentStatus) {
    case StatusTypes.COMPLETE:
      return 'confirmed';
    case StatusTypes.FAILED:
      return 'failed';
    case StatusTypes.PENDING:
    case StatusTypes.SUBMITTED:
      return 'submitted';
    case StatusTypes.UNKNOWN:
    default:
      return 'failed';
  }
};

/**
 * Maps BridgeStatusController StatusTypes to transaction status for non-intent transactions.
 * This provides the standard mapping for regular bridge/swap transactions.
 *
 * @param bridgeStatus - Status from BridgeStatusController
 * @returns Status string compatible with StatusText component
 */
export const mapBridgeStatusToTransactionStatus = (
  bridgeStatus: StatusTypes,
): 'confirmed' | 'submitted' | 'failed' => {
  switch (bridgeStatus) {
    case StatusTypes.COMPLETE:
      return 'confirmed';
    case StatusTypes.PENDING:
    case StatusTypes.SUBMITTED:
      return 'submitted';
    case StatusTypes.FAILED:
      return 'failed';
    case StatusTypes.UNKNOWN:
    default:
      return 'failed';
  }
};

/**
 * Gets the effective transaction status, prioritizing BridgeStatusController when available.
 * For same-chain swaps, prioritizes the transaction confirmation over bridge status since
 * TransactionController gets blockchain confirmation immediately while BridgeStatusController
 * polls every 10 seconds.
 *
 * Decision hierarchy:
 * 1. For non-bridge/swap transactions → use transaction.status directly
 * 2. For same-chain swaps that are confirmed → use transaction.status (immediate)
 * 3. For intent-based transactions → use intent status mapping from BridgeStatusController
 * 4. For bridge/swap transactions → use bridge status mapping from BridgeStatusController
 * 5. Fallback → use transaction.status if no bridge history available
 *
 * @param transaction - Transaction object (can be TransactionMeta or Transaction)
 * @param bridgeHistoryItem - Bridge transaction history item from BridgeStatusController
 * @returns Effective transaction status string
 */
export const getEffectiveTransactionStatus = (
  transaction: TransactionMeta | Transaction,
  bridgeHistoryItem: BridgeHistoryItem | undefined,
):
  | TransactionStatus
  | 'submitted'
  | 'failed'
  | 'unconfirmed'
  | 'confirmed'
  | 'pending' => {
  const { status, type } = transaction;

  // Check if it's a bridge or swap transaction
  // TransactionType.bridge = "bridge" and TransactionType.swap = "swap"
  const isBridgeOrSwap =
    type === TransactionType.bridge || type === TransactionType.swap;

  // If not a bridge/swap transaction, use transaction status directly
  if (!isBridgeOrSwap) {
    return status;
  }

  // If no bridge history item, fall back to transaction status
  if (!bridgeHistoryItem?.status) {
    return status;
  }

  // Determine if it's a same-chain swap
  const isSwap =
    bridgeHistoryItem.quote?.srcChainId ===
    bridgeHistoryItem.quote?.destChainId;
  const bridgeStatus = bridgeHistoryItem.status.status;

  // For same-chain swaps, if the source transaction is confirmed,
  // use that status instead of waiting for bridge status to update.
  // TransactionController gets blockchain confirmation immediately,
  // while BridgeStatusController polls every 10 seconds.
  if (isSwap && status === TransactionStatus.confirmed) {
    return status;
  }

  // For intent-based transactions, use intent status mapping
  if (bridgeHistoryItem.quote?.intent) {
    return mapIntentStatusToTransactionStatus(bridgeStatus);
  }

  // For non-intent bridge/swap transactions, use bridge status mapping
  return mapBridgeStatusToTransactionStatus(bridgeStatus);
};
