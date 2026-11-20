import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { findBridgeHistoryItem } from '../../../../../util/bridge/findBridgeHistoryItem';

interface UsePostTradeTxHashesParams {
  transactionMetaId?: string;
  transactionHash?: string;
}

export interface PostTradeTxHashes {
  /**
   * Source-chain hash. Smart-transaction, intent and hardware-wallet submits
   * often return it empty, so it is read from the transaction meta and the
   * bridge history as the chain reports it.
   */
  submittedTxHash?: string;
  /** Destination-chain hash of a bridge, once the bridge history has it. */
  destinationTxHash?: string;
}

/**
 * Returns the chain hashes of the trade the sheet shows. It uses the same
 * lookup as `usePostTradeTxStatus`, so it reads the entry that drives the
 * sheet's status. A transaction id is never returned as a hash.
 */
export const usePostTradeTxHashes = ({
  transactionMetaId,
  transactionHash,
}: UsePostTradeTxHashesParams): PostTradeTxHashes => {
  const transactionMeta = useSelector((state: RootState) =>
    transactionMetaId
      ? selectTransactionMetadataById(state, transactionMetaId)
      : undefined,
  ) as TransactionMeta | undefined;
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const knownSubmittedTxHash =
    transactionMeta?.hash || transactionHash || undefined;

  const bridgeHistoryItem = findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId,
    transactionActionId: transactionMeta?.actionId,
    transactionHash: knownSubmittedTxHash,
  });

  return {
    submittedTxHash:
      knownSubmittedTxHash ||
      bridgeHistoryItem?.reportedSubmittedTxHash ||
      bridgeHistoryItem?.status?.srcChain?.txHash ||
      undefined,
    destinationTxHash:
      bridgeHistoryItem?.status?.destChain?.txHash || undefined,
  };
};
