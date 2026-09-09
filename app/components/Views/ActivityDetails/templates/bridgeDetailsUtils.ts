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
 * The transaction the block-explorer sheet resolves both legs from. EVM rows
 * pass the looked-up local `TransactionMeta`; non-EVM still reads the keyring
 * tx off `raw`. Empty for indexer-only rows.
 */
export function getBridgeExplorerSheetTx(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
  transactionMeta?: TransactionMeta,
): { evmTxMeta?: TransactionMeta; multiChainTx?: Transaction } {
  if (transactionMeta) {
    return { evmTxMeta: transactionMeta };
  }
  if (item.raw?.type === 'keyringTransaction') {
    return { multiChainTx: item.raw.data };
  }
  return {};
}

export function getBridgeHistoryItem(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
  bridgeHistory: Record<string, BridgeHistoryItem>,
  transactionMeta?: TransactionMeta,
) {
  return findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId: transactionMeta?.id,
    transactionActionId: transactionMeta?.actionId,
    transactionHash: item.hash,
  });
}
