import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  type ActivityListItem,
  type TokenAmount,
  getKeyringTransactionId,
  getLocalTransactionActionId,
  getLocalTransactionInitialMetaId,
  getLocalTransactionMetaId,
} from '../../../../util/activity-adapters';
import { findBridgeHistoryItem } from '../../../../util/bridge/findBridgeHistoryItem';
import { getAssetIdCaipChainId } from '../activityAssetId';
import { useKeyringTransactionById } from '../hooks/useKeyringTransactionById';
import { useLocalTransactionMetaById } from '../hooks/useActivityTransactionSources';

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
  transactionMetaId?: string,
  transactionActionId?: string,
) {
  return findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId,
    transactionActionId,
    transactionHash: item.hash,
  });
}

export function useBridgeHistoryItem(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
  bridgeHistory: Record<string, BridgeHistoryItem>,
) {
  const initialMetaId =
    getLocalTransactionInitialMetaId(item) ?? getLocalTransactionMetaId(item);
  const initialMeta = useLocalTransactionMetaById(initialMetaId);
  const actionId =
    getLocalTransactionActionId(item) ?? initialMeta?.actionId ?? undefined;

  return getBridgeHistoryItem(
    item,
    bridgeHistory,
    initialMeta?.id ?? initialMetaId,
    actionId,
  );
}

export function useBridgeExplorerSheetTx(
  item: Extract<ActivityListItem, { type: 'bridge' }>,
): { evmTxMeta?: TransactionMeta; multiChainTx?: Transaction } {
  const initialMetaId =
    getLocalTransactionInitialMetaId(item) ?? getLocalTransactionMetaId(item);
  const evmTxMeta = useLocalTransactionMetaById(initialMetaId);
  const multiChainTx = useKeyringTransactionById(getKeyringTransactionId(item));
  return { evmTxMeta, multiChainTx };
}
