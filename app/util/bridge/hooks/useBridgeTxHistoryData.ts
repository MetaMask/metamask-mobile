import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import {
  selectBatchSellHistoryItemsForTxHash,
  selectBridgeHistoryForAccount,
} from '../../../selectors/bridgeStatusController';
import { Transaction } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { findBridgeHistoryItem } from '../findBridgeHistoryItem';
import { FeatureId } from '@metamask/bridge-controller';

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
}: UseBridgeTxHistoryDataProps): {
  bridgeTxHistoryItem: BridgeHistoryItem | undefined;
  batchSellHistoryItems?: BridgeHistoryItem[];
  is7702Batch?: boolean;
  batchTotalDestAmount?: number;
  isBridgeComplete: boolean | null;
} {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const { historyItems } = useSelector((state: unknown) =>
    selectBatchSellHistoryItemsForTxHash(state, evmTxMeta?.hash),
  );

  let bridgeHistoryItem: BridgeHistoryItem | undefined;
  if (evmTxMeta) {
    bridgeHistoryItem = findBridgeHistoryItem({
      bridgeHistory,
      transactionMetaId: evmTxMeta.id,
      transactionActionId: evmTxMeta.actionId,
      transactionHash: evmTxMeta.hash,
    });
  } else if (multiChainTx) {
    bridgeHistoryItem = findBridgeHistoryItem({
      bridgeHistory,
      transactionHash: multiChainTx.id,
    });
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
    batchSellHistoryItems: historyItems,
    is7702Batch:
      bridgeHistoryItem?.featureId === FeatureId.BATCH_SELL &&
      (evmTxMeta?.nestedTransactions?.length ?? 0) > 1,
    batchTotalDestAmount: historyItems?.reduce(
      (acc, item) => acc + parseFloat(item.quote.destTokenAmount),
      0,
    ),
    isBridgeComplete,
  };
}
