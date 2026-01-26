import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { Transaction } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';

export const FINAL_NON_CONFIRMED_STATUSES = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
];

export interface UseBridgeTxHistoryDataProps {
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}

/**
 * Hook to fetch and manage bridge transaction history data for a given transaction.
 * This hook provides access to the bridge-specific transaction details that aren't
 * available in the standard transaction metadata.
 *
 * @param evmTxMeta - The EVM transaction metadata
 * @param multiChainTx - The multi-chain transaction
 * @returns The bridge transaction history item and whether the bridge is complete
 */
export function useBridgeTxHistoryData({
  evmTxMeta,
  multiChainTx,
}: UseBridgeTxHistoryDataProps) {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  let bridgeHistoryItem: BridgeHistoryItem | undefined;
  if (evmTxMeta) {
    const srcTxMetaId = evmTxMeta?.id;
    bridgeHistoryItem = srcTxMetaId ? bridgeHistory[srcTxMetaId] : undefined;

    // If not found, try to find by originalTransactionId for intent transactions
    if (!bridgeHistoryItem && srcTxMetaId) {
      const matchingEntry = Object.entries(bridgeHistory).find(
        ([_, historyItem]) =>
          (historyItem as unknown as { originalTransactionId: string })
            .originalTransactionId === srcTxMetaId,
      );
      bridgeHistoryItem = matchingEntry ? matchingEntry[1] : undefined;
    }
  } else if (multiChainTx) {
    const srcTxHash = multiChainTx?.id;
    bridgeHistoryItem = Object.values(bridgeHistory).find(
      (item) => item.status.srcChain.txHash === srcTxHash,
    );
  }

  // By complete, this means BOTH source and dest tx are confirmed
  const isBridgeComplete = bridgeHistoryItem
    ? Boolean(
        bridgeHistoryItem?.status.srcChain.txHash &&
          bridgeHistoryItem.status.destChain?.txHash,
      )
    : null;

  return {
    bridgeTxHistoryItem: bridgeHistoryItem,
    isBridgeComplete,
  };
}
