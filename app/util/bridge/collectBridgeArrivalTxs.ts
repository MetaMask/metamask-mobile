import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  formatChainIdToCaip,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../constants/bridge';
import { findBridgeHistoryItem } from '../bridge/findBridgeHistoryItem';

type PageAsset = {
  chainId?: string;
  address?: string;
  symbol?: string;
  isNative?: boolean;
  isETH?: boolean;
};

type BridgeDestMatchParams = {
  quote: BridgeHistoryItem['quote'];
  pageAsset: PageAsset;
  nativeAssetId?: string;
};

export function bridgeDestMatchesPageAsset({
  quote,
  pageAsset,
  nativeAssetId,
}: BridgeDestMatchParams): boolean {
  if (quote?.destChainId === undefined || quote?.destChainId === null) {
    return false;
  }

  const destAssetId = quote.destAsset?.assetId?.toLowerCase();
  const assetAddress = pageAsset.address?.toLowerCase();
  const isNativeAsset = pageAsset.isNative || pageAsset.isETH;

  if (isNativeAsset) {
    if (destAssetId && nativeAssetId) {
      return destAssetId === nativeAssetId.toLowerCase();
    }

    const destAddress = quote.destAsset?.address?.toLowerCase();
    const isNativeDestination =
      !destAddress || destAddress === NATIVE_SWAPS_TOKEN_ADDRESS;

    return Boolean(nativeAssetId && isNativeDestination);
  }

  return Boolean(
    assetAddress &&
      destAssetId &&
      (destAssetId === assetAddress || destAssetId.includes(assetAddress)),
  );
}

type CollectBridgeArrivalTxsParams = {
  bridgeHistory: Record<string, BridgeHistoryItem>;
  evmTransactions: unknown[];
  nonEvmTransactions?: unknown[];
  pageAsset: PageAsset;
  isNonEvmAsset: boolean;
  pageChainId?: string;
  nativeAssetId?: string;
  isBridgeTx: (tx: {
    type?: string;
    status?: string;
  }) => boolean;
  findHistoryForTx: (tx: {
    id?: string;
    actionId?: string;
    hash?: string;
  }) => BridgeHistoryItem | undefined;
};

export function collectBridgeArrivalTxs({
  bridgeHistory,
  evmTransactions,
  nonEvmTransactions = [],
  pageAsset,
  isNonEvmAsset,
  pageChainId,
  nativeAssetId,
  isBridgeTx,
  findHistoryForTx,
}: CollectBridgeArrivalTxsParams): unknown[] {
  const pageChainCaip =
    isNonEvmAsset && pageAsset.chainId
      ? pageAsset.chainId
      : pageChainId
        ? formatChainIdToCaip(pageChainId)
        : undefined;

  if (!pageChainCaip) {
    return [];
  }

  const arrivals: unknown[] = [];
  const seenIds = new Set<string>();

  const addArrival = (tx: { id?: string }) => {
    if (!tx.id || seenIds.has(tx.id)) {
      return;
    }
    seenIds.add(tx.id);
    arrivals.push(tx);
  };

  for (const tx of evmTransactions) {
    const typedTx = tx as {
      id?: string;
      actionId?: string;
      hash?: string;
      type?: string;
      status?: string;
    };

    if (!isBridgeTx(typedTx)) {
      continue;
    }

    const quote = findHistoryForTx(typedTx)?.quote;
    if (!quote) {
      continue;
    }

    if (formatChainIdToCaip(quote.destChainId) !== pageChainCaip) {
      continue;
    }

    if (
      !bridgeDestMatchesPageAsset({
        quote,
        pageAsset,
        nativeAssetId,
      })
    ) {
      continue;
    }

    addArrival(typedTx);
  }

  for (const historyItem of Object.values(bridgeHistory)) {
    const quote = historyItem.quote;
    if (!quote || quote.srcChainId === quote.destChainId) {
      continue;
    }

    if (formatChainIdToCaip(quote.destChainId) !== pageChainCaip) {
      continue;
    }

    if (
      !bridgeDestMatchesPageAsset({
        quote,
        pageAsset,
        nativeAssetId,
      })
    ) {
      continue;
    }

    const destTxHash = historyItem.status?.destChain?.txHash;
    if (destTxHash && !isNonEvmAsset) {
      const destTx = evmTransactions.find((tx) => {
        const typed = tx as { id?: string; hash?: string };
        return (
          typed.id === destTxHash ||
          typed.hash?.toLowerCase() === destTxHash.toLowerCase()
        );
      });
      if (destTx) {
        addArrival(destTx as { id?: string });
      }
    }

    if (!isNonEvmChainId(quote.srcChainId)) {
      continue;
    }

    const srcChainCaip = formatChainIdToCaip(quote.srcChainId);
    const srcTxId =
      historyItem.status?.srcChain?.txHash ?? historyItem.txMetaId;
    const srcTx = nonEvmTransactions.find((tx) => {
      const typed = tx as { id?: string; chain?: string };
      return (
        (typed.id === srcTxId || typed.id === historyItem.txMetaId) &&
        typed.chain === srcChainCaip
      );
    });

    if (srcTx && isNonEvmAsset) {
      addArrival(srcTx as { id?: string });
    }
  }

  return arrivals;
}

export function createBridgeHistoryFinder(
  bridgeHistory: Record<string, BridgeHistoryItem>,
) {
  return (tx: { id?: string; actionId?: string; hash?: string }) =>
    findBridgeHistoryItem({
      bridgeHistory,
      transactionMetaId: tx.id,
      transactionActionId: tx.actionId,
      transactionHash: tx.hash,
    });
}
