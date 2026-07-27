import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
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
