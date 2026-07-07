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
  currentChainId,
  tokenChainId,
}: {
  transaction: TransactionWithImportTime;
  assetSymbol?: string;
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
  const transactionGroup: TransactionGroup = {
    initialTransaction: transaction,
    primaryTransaction: transaction,
    nativeAssetSymbol: assetSymbol,
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
