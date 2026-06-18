import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  mapLocalTransaction,
  type ActivityListItem,
  type TransactionGroup,
} from '../../../util/activity-adapters';

export type TransactionWithImportTime = TransactionMeta & {
  insertImportTime?: boolean;
};

export const getActivityValue = (item: ActivityListItem) => {
  const { data } = item;

  if ('token' in data && data.token?.symbol) {
    return `${data.token.amount ?? ''} ${data.token.symbol}`.trim();
  }

  if ('destinationToken' in data && data.destinationToken?.symbol) {
    return `${data.destinationToken.amount ?? ''} ${
      data.destinationToken.symbol
    }`.trim();
  }

  if ('sourceToken' in data && data.sourceToken?.symbol) {
    return `${data.sourceToken.amount ?? ''} ${data.sourceToken.symbol}`.trim();
  }

  return undefined;
};

export const getActivityFromTo = (item: ActivityListItem) => {
  const { data } = item;
  if ('from' in data || 'to' in data) {
    return { from: data.from, to: data.to };
  }
  return {};
};

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
