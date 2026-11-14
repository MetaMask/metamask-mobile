import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { findBridgeHistoryItem } from '../../../../../util/bridge/findBridgeHistoryItem';

interface UsePostTradeDestinationTxHashParams {
  transactionMetaId?: string;
  transactionHash?: string;
}

/**
 * Returns the destination-chain hash of a bridge, once the bridge history has
 * it. It uses the same lookup as `usePostTradeTxStatus`, so it reads the entry
 * that drives the sheet's status. The status only reaches success for a bridge
 * after this hash exists.
 */
export const usePostTradeDestinationTxHash = ({
  transactionMetaId,
  transactionHash,
}: UsePostTradeDestinationTxHashParams): string | undefined => {
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
    transactionHash: transactionMeta?.hash || transactionHash || undefined,
  });

  return bridgeHistoryItem?.status?.destChain?.txHash || undefined;
};
