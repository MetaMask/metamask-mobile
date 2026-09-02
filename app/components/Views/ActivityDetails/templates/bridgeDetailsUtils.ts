import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { findBridgeHistoryItem } from '../../../../util/bridge/findBridgeHistoryItem';
import { getAssetIdCaipChainId } from '../activityAssetId';

export function getBridgeDestinationCaipChainId(
  token: TokenAmount | undefined,
) {
  return getAssetIdCaipChainId(token?.assetId);
}

export function getBridgeDestinationTxHash(
  bridgeHistoryItem: BridgeHistoryItem | undefined,
) {
  return bridgeHistoryItem?.status.destChain?.txHash;
}

/**
 * The transaction the block-explorer sheet resolves both legs from. Uses
 * `initialTransaction`, matching {@link getBridgeHistoryItem}, so the two can't
 * land on different history items. Empty for indexer-only rows, which have no
 * local transaction.
 */
export function getBridgeExplorerSheetTx(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
): { evmTxMeta?: TransactionMeta; multiChainTx?: Transaction } {
  if (item.raw?.type === 'localTransaction') {
    return { evmTxMeta: item.raw.data.initialTransaction };
  }
  if (item.raw?.type === 'keyringTransaction') {
    return { multiChainTx: item.raw.data };
  }
  return {};
}

export function getBridgeHistoryItem(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
  bridgeHistory: Record<string, BridgeHistoryItem>,
) {
  const transactionMeta =
    item.raw?.type === 'localTransaction'
      ? item.raw.data.initialTransaction
      : undefined;

  return findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId: transactionMeta?.id,
    transactionActionId: transactionMeta?.actionId,
    transactionHash: item.hash,
  });
}
