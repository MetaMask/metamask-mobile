import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { useMemo } from 'react';

const normalizeEvmTransactionHash = (hash: string) =>
  /^0x/i.test(hash) ? hash.toLowerCase() : undefined;

/**
 * Looks up by exact source tx hash, with case-insensitive matching for EVM hashes.
 */
export const findBridgeHistoryItemBySrcTxHash = (
  bridgeHistoryItemsBySrcTxHash: Record<string, BridgeHistoryItem>,
  hash?: string,
): BridgeHistoryItem | undefined => {
  if (!hash) {
    return undefined;
  }

  const normalizedHash = normalizeEvmTransactionHash(hash);
  return (
    bridgeHistoryItemsBySrcTxHash[hash] ??
    (normalizedHash ? bridgeHistoryItemsBySrcTxHash[normalizedHash] : undefined)
  );
};

/**
 * This hook is used to get the bridge history item by source transaction hash.
 * It is used to get the bridge history item for the non EVM transactions.
 *
 * Also exposes a destination-hash map: a cross-chain bridge's receiving leg is
 * a separate on-chain tx whose hash only appears in `status.destChain.txHash`,
 * so matching by source hash alone can never recognize the fill as a bridge.
 */
export const useBridgeHistoryItemBySrcTxHash = () => {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  // Create lookup maps for faster access to bridge history items by
  // source/destination transaction hash.
  const { bridgeHistoryItemsBySrcTxHash, bridgeHistoryItemsByDestTxHash } =
    useMemo(() => {
      const bySrcTxHash: Record<string, BridgeHistoryItem> = {};
      const byDestTxHash: Record<string, BridgeHistoryItem> = {};

      Object.values(bridgeHistory ?? {}).forEach((bridgeTx) => {
        const srcTxHash = bridgeTx.status?.srcChain?.txHash;
        if (srcTxHash) {
          bySrcTxHash[srcTxHash] = bridgeTx;
          const normalizedSrcTxHash = normalizeEvmTransactionHash(srcTxHash);
          if (normalizedSrcTxHash) {
            bySrcTxHash[normalizedSrcTxHash] = bridgeTx;
          }
        }
        const destTxHash = bridgeTx.status?.destChain?.txHash;
        if (destTxHash) {
          byDestTxHash[destTxHash] = bridgeTx;
          const normalizedDestTxHash = normalizeEvmTransactionHash(destTxHash);
          if (normalizedDestTxHash) {
            byDestTxHash[normalizedDestTxHash] = bridgeTx;
          }
        }
      });

      return {
        bridgeHistoryItemsBySrcTxHash: bySrcTxHash,
        bridgeHistoryItemsByDestTxHash: byDestTxHash,
      };
    }, [bridgeHistory]);

  return {
    bridgeHistoryItemsBySrcTxHash,
    bridgeHistoryItemsByDestTxHash,
  };
};
