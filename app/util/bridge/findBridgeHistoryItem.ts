import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { equalsIgnoreCase } from '../string';

interface FindBridgeHistoryItemParams {
  bridgeHistory: Record<string, BridgeHistoryItem>;
  transactionMetaId?: string;
  transactionActionId?: string;
  transactionHash?: string;
}

// Bridge history entries can be keyed by tx meta ID, action ID, or API-normalized IDs.
export const findBridgeHistoryItem = ({
  bridgeHistory,
  transactionMetaId,
  transactionActionId,
  transactionHash,
}: FindBridgeHistoryItemParams) => {
  if (transactionMetaId && bridgeHistory[transactionMetaId]) {
    return bridgeHistory[transactionMetaId];
  }

  if (transactionActionId && bridgeHistory[transactionActionId]) {
    return bridgeHistory[transactionActionId];
  }

  if (transactionMetaId) {
    const itemByOriginalTransactionId = Object.values(bridgeHistory).find(
      (historyItem) => historyItem.originalTransactionId === transactionMetaId,
    );

    if (itemByOriginalTransactionId) {
      return itemByOriginalTransactionId;
    }
  }

  if (!transactionHash) {
    return undefined;
  }

  const itemBySrcTxHash = Object.values(bridgeHistory).find((item) =>
    equalsIgnoreCase(item.status?.srcChain?.txHash, transactionHash),
  );

  if (itemBySrcTxHash) {
    return itemBySrcTxHash;
  }

  return Object.values(bridgeHistory).find((item) =>
    equalsIgnoreCase(item.status?.destChain?.txHash, transactionHash),
  );
};
