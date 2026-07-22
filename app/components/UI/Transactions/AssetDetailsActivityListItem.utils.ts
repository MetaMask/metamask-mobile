import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  getActivityFromTo,
  getActivityValue,
  mapLocalTransaction,
  type ActivityListItem,
  type TransactionGroup,
} from '../../../util/activity-adapters';

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
}: {
  transaction: TransactionWithImportTime;
  assetSymbol?: string;
  assetDecimals?: number;
  assetAddress?: string;
  nativeAssetSymbol?: string;
  currentChainId?: Hex;
  tokenChainId?: Hex;
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

  const transactionGroup: TransactionGroup = {
    initialTransaction: transaction,
    primaryTransaction: transaction,
    // Legacy callers passed the asset symbol here; keep that behavior when no
    // explicit native symbol is provided.
    nativeAssetSymbol: nativeAssetSymbol ?? assetSymbol,
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
