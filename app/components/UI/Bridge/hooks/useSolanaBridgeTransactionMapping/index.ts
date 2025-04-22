import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { useMemo } from 'react';

/**
 * Hook that takes a list of non-EVM transactions and enhances them with information
 * about related bridge operations. It identifies transactions that are part of a bridge,
 * adds details like destination chain and status, and includes transactions found
 * only in the bridge history (marked as `isBridgeOriginated`).
 *
 * @param initialNonEvmTransactions - The initial list of non-EVM transactions (assumed to be base `Transaction` type).
 * @returns An object containing the list of enhanced transactions (mixed `ExtendedTransaction` and `BridgeOriginatedItem`), or undefined if the input was undefined.
 */
export const useSolanaBridgeTransactionMapping = () => {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  // Create a lookup map for faster access to bridge history items by source transaction hash.
  const bridgeHistoryItemsBySrcTxHash: Record<string, BridgeHistoryItem> =
    useMemo(() => {
      const bridgeHistoryItemsBySrcTxHash_: Record<string, BridgeHistoryItem> =
        {};

      Object.values(bridgeHistory ?? {}).forEach((bridgeTx) => {
        const txHash = bridgeTx.status?.srcChain?.txHash;
        if (txHash) {
          bridgeHistoryItemsBySrcTxHash_[txHash] = bridgeTx;
        }
      });

      return bridgeHistoryItemsBySrcTxHash_;
    }, [bridgeHistory]);

  return {
    bridgeHistoryItemsBySrcTxHash,
  };
};
