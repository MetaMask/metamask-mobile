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
 * The transaction the block-explorer sheet needs to resolve both legs. It
 * re-derives bridge history itself, so it takes `initialTransaction` — the same
 * one {@link getBridgeHistoryItem} looks up with, so the two cannot resolve to
 * different history items. Returns an empty object for rows backed only by the
 * indexer, which carry no local transaction for the sheet to work from.
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
