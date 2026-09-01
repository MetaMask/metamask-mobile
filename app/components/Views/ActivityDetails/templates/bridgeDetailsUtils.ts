import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import {
  type ActivityListItem,
  type TokenAmount,
  getKeyringTransactionId,
  getLocalTransactionActionId,
  getLocalTransactionInitialMetaId,
  getLocalTransactionMetaId,
} from '../../../../util/activity-adapters';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import type { RootState } from '../../../../reducers';
import { findBridgeHistoryItem } from '../../../../util/bridge/findBridgeHistoryItem';
import { getAssetIdCaipChainId } from '../activityAssetId';

function useTransactionMetaById(
  metaId: string | undefined,
): TransactionMeta | undefined {
  return useSelector((state: RootState) =>
    metaId ? selectTransactionMetadataById(state, metaId) : undefined,
  );
}

function useKeyringTransactionById(
  transactionId: string | undefined,
): Transaction | undefined {
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );
  if (!transactionId) {
    return undefined;
  }
  const normalizedId = transactionId.toLowerCase();
  return nonEvmState?.transactions.find(
    (transaction) => transaction.id.toLowerCase() === normalizedId,
  );
}

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
  const initialMeta = useTransactionMetaById(initialMetaId);
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
  const evmTxMeta = useTransactionMetaById(initialMetaId);
  const multiChainTx = useKeyringTransactionById(getKeyringTransactionId(item));
  return { evmTxMeta, multiChainTx };
}
