import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { StatusTypes } from '@metamask/bridge-controller';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type {
  BridgeHistoryItem,
  StatusResponse,
} from '@metamask/bridge-status-controller';
import type { RootState } from '../../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { equalsIgnoreCase } from '../../../../../util/string';
import { PostTradeStatus } from './PostTradeBottomSheet.types';

interface UsePostTradeTxStatusParams {
  initialStatus: PostTradeStatus;
  transactionMetaId?: string;
  transactionHash?: string;
  initialTransactionStatus?: TransactionStatus;
}

const FAILED_TRANSACTION_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
  TransactionStatus.cancelled,
]);

const FAILED_BRIDGE_STATUSES = new Set<StatusTypes>([
  StatusTypes.FAILED,
  StatusTypes.UNKNOWN,
]);

const isFailedTransactionStatus = (
  status: TransactionStatus | undefined,
): boolean => Boolean(status && FAILED_TRANSACTION_STATUSES.has(status));

const findBridgeHistoryItem = ({
  bridgeHistory,
  transactionMetaId,
  transactionHash,
}: {
  bridgeHistory: Record<string, BridgeHistoryItem>;
  transactionMetaId?: string;
  transactionHash?: string;
}) => {
  if (transactionMetaId && bridgeHistory[transactionMetaId]) {
    return bridgeHistory[transactionMetaId];
  }

  if (!transactionHash) {
    return undefined;
  }

  return Object.values(bridgeHistory).find((item) =>
    equalsIgnoreCase(item.status?.srcChain?.txHash, transactionHash),
  );
};

const getBridgeStatus = (
  bridgeHistoryItem: BridgeHistoryItem | undefined,
): StatusResponse['status'] | undefined => bridgeHistoryItem?.status?.status;

export const usePostTradeTxStatus = ({
  initialStatus,
  transactionMetaId,
  transactionHash,
  initialTransactionStatus,
}: UsePostTradeTxStatusParams): PostTradeStatus => {
  const transactionMeta = useSelector((state: RootState) =>
    transactionMetaId
      ? selectTransactionMetadataById(state, transactionMetaId)
      : undefined,
  ) as TransactionMeta | undefined;
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const bridgeHistoryItem = useMemo(
    () =>
      findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId,
        transactionHash: transactionMeta?.hash ?? transactionHash,
      }),
    [bridgeHistory, transactionHash, transactionMeta?.hash, transactionMetaId],
  );

  if (initialStatus === PostTradeStatus.Failed) {
    return PostTradeStatus.Failed;
  }

  const transactionStatus = transactionMeta?.status ?? initialTransactionStatus;
  if (isFailedTransactionStatus(transactionStatus)) {
    return PostTradeStatus.Failed;
  }

  const bridgeStatus = getBridgeStatus(bridgeHistoryItem);
  if (bridgeStatus && FAILED_BRIDGE_STATUSES.has(bridgeStatus)) {
    return PostTradeStatus.Failed;
  }

  if (bridgeStatus === StatusTypes.COMPLETE) {
    return PostTradeStatus.Success;
  }

  if (!bridgeHistoryItem && transactionStatus === TransactionStatus.confirmed) {
    return PostTradeStatus.Success;
  }

  return PostTradeStatus.InProgress;
};
