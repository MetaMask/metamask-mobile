import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';

export const FINAL_NON_CONFIRMED_STATUSES = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
];

export interface UseBridgeTxHistoryDataProps {
    txMeta: TransactionMeta;
}

export function useBridgeTxHistoryData({txMeta}: UseBridgeTxHistoryDataProps) {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const srcTxMetaId = txMeta.id;
  const bridgeHistoryItem = bridgeHistory[srcTxMetaId];

  // By complete, this means BOTH source and dest tx are confirmed
  const isBridgeComplete = bridgeHistoryItem
    ? Boolean(
        bridgeHistoryItem?.status.srcChain.txHash &&
          bridgeHistoryItem.status.destChain?.txHash,
      )
    : null;

  return {
    bridgeTxHistoryItem: bridgeHistoryItem,
    isBridgeComplete,
  };
}
