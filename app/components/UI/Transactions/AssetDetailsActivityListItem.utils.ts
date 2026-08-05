import type { TransactionMeta } from '@metamask/transaction-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Hex } from '@metamask/utils';
import {
  getActivityFromTo,
  getActivityValue,
  mapLocalTransaction,
  type ActivityListItem,
  type TransactionGroup,
} from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity enrichment, kept next to the Activity list that owns it; route-isolation backlog
import {
  getBridgeActivityStatus,
  getSwapTokenEnrichment,
} from '../../Views/ActivityList/hooks/useLocalActivityItems';

export type TransactionWithImportTime = TransactionMeta & {
  insertImportTime?: boolean;
};

export { getActivityFromTo, getActivityValue };

export const mapTransactionToActivityItem = ({
  transaction: tx,
  assetSymbol,
  assetDecimals,
  assetAddress,
  nativeAssetSymbol,
  currentChainId,
  tokenChainId,
  bridgeHistoryItem,
}: {
  transaction: TransactionWithImportTime;
  assetSymbol?: string;
  assetDecimals?: number;
  assetAddress?: string;
  nativeAssetSymbol?: string;
  currentChainId?: Hex;
  tokenChainId?: Hex;
  /**
   * Bridge/swaps history entry for this tx. Carries the quote that names both
   * swap legs — without it a unified swap has no resolvable destination and the
   * adapter degrades the row to `swapIncomplete`.
   */
  bridgeHistoryItem?: BridgeHistoryItem;
}) => {
  const chainId = tx.chainId ?? tokenChainId ?? currentChainId;
  const transaction = {
    ...tx,
    chainId,
    txParams: {
      ...tx.txParams,
      chainId: tx.txParams?.chainId ?? chainId,
    },
  };

  // Attach the asset's metadata only when the tx targets its contract
  // (transfer/approve: txParams.to === token address), mirroring the
  // enrichment in useLocalActivityItems. Prevents mislabeling router/swap
  // txs with this token's decimals.
  const isAssetContractTx =
    assetAddress !== undefined &&
    transaction.txParams?.to?.toLowerCase() === assetAddress.toLowerCase();

  // Legacy callers passed the asset symbol here; keep that behavior when no
  // explicit native symbol is provided.
  const resolvedNativeAssetSymbol = nativeAssetSymbol ?? assetSymbol;

  const { sourceToken, destinationToken } = getSwapTokenEnrichment(
    transaction,
    resolvedNativeAssetSymbol,
    bridgeHistoryItem,
  );
  const activityStatus = getBridgeActivityStatus(
    transaction,
    bridgeHistoryItem,
  );

  const transactionGroup: TransactionGroup = {
    initialTransaction: transaction,
    primaryTransaction: transaction,
    nativeAssetSymbol: resolvedNativeAssetSymbol,
    ...(sourceToken ? { sourceToken } : {}),
    ...(destinationToken ? { destinationToken } : {}),
    ...(activityStatus ? { activityStatus } : {}),
    ...(isAssetContractTx
      ? {
          contractTokenMetadata: {
            symbol: assetSymbol,
            decimals: assetDecimals,
          },
        }
      : {}),
  };

  return mapLocalTransaction(transactionGroup);
};

export const getTransactionDetailsParams = ({
  item,
  selectedTx,
  actionKey,
  value,
  from,
  to,
  currentChainId,
  tokenChainId,
  showSpeedUpModal,
  showCancelModal,
}: {
  item: ActivityListItem;
  selectedTx: TransactionMeta;
  actionKey: string;
  value?: string;
  from?: string;
  to?: string;
  currentChainId?: Hex;
  tokenChainId?: Hex;
  showSpeedUpModal: () => void;
  showCancelModal: () => void;
}) => ({
  tx: selectedTx,
  transactionElement: {
    actionKey,
    value,
  },
  transactionDetails: {
    hash: item.hash,
    renderFrom: from,
    renderTo: to,
    renderValue: value,
    transactionType: item.type,
    txChainId: selectedTx.chainId ?? tokenChainId ?? currentChainId,
  },
  showSpeedUpModal,
  showCancelModal,
});
