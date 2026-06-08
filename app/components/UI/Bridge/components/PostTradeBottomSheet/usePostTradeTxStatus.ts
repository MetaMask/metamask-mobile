import { useSelector } from 'react-redux';
import { StatusTypes } from '@metamask/bridge-controller';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { findBridgeHistoryItem } from '../../../../../util/bridge/findBridgeHistoryItem';
import { PostTradeStatus } from './PostTradeBottomSheet.types';

interface UsePostTradeTxStatusParams {
  initialStatus: PostTradeStatus;
  isBridge: boolean;
  transactionMetaId?: string;
  transactionHash?: string;
}

export const usePostTradeTxStatus = ({
  initialStatus,
  isBridge,
  transactionMetaId,
  transactionHash,
}: UsePostTradeTxStatusParams): PostTradeStatus => {
  const transactionMeta = useSelector((state: RootState) =>
    transactionMetaId
      ? selectTransactionMetadataById(state, transactionMetaId)
      : undefined,
  ) as TransactionMeta | undefined;
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const bridgeHistoryItem = findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId,
    transactionActionId: transactionMeta?.actionId,
    transactionHash: transactionMeta?.hash ?? transactionHash,
  });

  if (initialStatus === PostTradeStatus.Failed) {
    return PostTradeStatus.Failed;
  }

  const transactionStatus = transactionMeta?.status;
  if (
    transactionStatus === TransactionStatus.failed ||
    transactionStatus === TransactionStatus.dropped ||
    transactionStatus === TransactionStatus.rejected ||
    transactionStatus === TransactionStatus.cancelled
  ) {
    return PostTradeStatus.Failed;
  }

  const bridgeStatus = bridgeHistoryItem?.status?.status;
  if (bridgeStatus === StatusTypes.FAILED) {
    return PostTradeStatus.Failed;
  }

  if (bridgeStatus === StatusTypes.COMPLETE) {
    return PostTradeStatus.Success;
  }

  if (!isBridge && transactionStatus === TransactionStatus.confirmed) {
    return PostTradeStatus.Success;
  }

  return PostTradeStatus.InProgress;
};
