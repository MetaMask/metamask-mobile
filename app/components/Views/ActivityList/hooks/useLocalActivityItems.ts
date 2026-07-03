/**
 * Builds enriched TransactionGroups from Mobile's local transactions and maps them
 * to ActivityListItem[] using the shared mapLocalTransaction adapter.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { selectLocalTransactions } from '../../../../selectors/transactionController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectAllTokens } from '../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  mapLocalTransaction,
  mobileActivityAdapterEnvironment,
  type TransactionGroup,
  type ActivityListItem,
  type Status,
  type TokenAmount,
} from '../../../../util/activity-adapters';

const BRIDGE_FAIL_STATUSES = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
] as string[];

const QUEUE_BLOCKING_STATUSES = new Set<string>([
  TransactionStatus.submitted,
  TransactionStatus.signed,
  'approved',
  'unapproved',
]);

/**
 * Checks whether a transaction is a TransactionMeta (vs SmartTransaction).
 * SmartTransaction objects have chainId on the object when returned from the Mobile selector.
 */
function isTransactionMetaLike(
  tx: unknown,
): tx is TransactionMeta & { isSmartTransaction?: boolean } {
  return Boolean(
    tx &&
      typeof tx === 'object' &&
      'txParams' in tx &&
      (tx as { txParams?: unknown }).txParams !== undefined,
  );
}

/**
 * Returns whether the pending transaction has the lowest nonce among all pending
 * transactions for the same sender+chain, which determines if it is "earliest".
 */
function computeIsEarliestNonce(
  tx: TransactionMeta,
  allLocalTxs: TransactionMeta[],
): boolean {
  const { txParams } = tx;
  if (
    !txParams?.from ||
    txParams.nonce === undefined ||
    txParams.nonce === null
  ) {
    return true;
  }
  const ownNonce = Number(txParams.nonce);
  const from = txParams.from.toLowerCase();
  const chain = tx.chainId?.toLowerCase();

  return !allLocalTxs.some((other) => {
    if (other.id === tx.id) return false;
    if (!QUEUE_BLOCKING_STATUSES.has(other.status)) return false;
    const otherNonce = Number(other.txParams?.nonce);
    return (
      other.txParams?.from?.toLowerCase() === from &&
      other.chainId?.toLowerCase() === chain &&
      otherNonce < ownNonce
    );
  });
}

function getTransactionGroupKey(tx: TransactionMeta): string {
  const chainId = tx.chainId?.toLowerCase() ?? 'unknown-chain';
  const from = tx.txParams?.from?.toLowerCase() ?? 'unknown-from';
  const nonce = tx.txParams?.nonce;

  if (nonce !== undefined && nonce !== null) {
    return `${chainId}:${from}:${nonce}`;
  }

  return `${chainId}:${from}:${tx.id}`;
}

function buildTransactionGroups(
  transactions: (TransactionMeta & { isSmartTransaction?: boolean })[],
): TransactionGroup[] {
  const groupsByKey = new Map<
    string,
    (TransactionMeta & { isSmartTransaction?: boolean })[]
  >();

  for (const tx of transactions) {
    const key = getTransactionGroupKey(tx);
    const group = groupsByKey.get(key) ?? [];
    group.push(tx);
    groupsByKey.set(key, group);
  }

  return [...groupsByKey.values()].map((groupTransactions) => {
    const sorted = [...groupTransactions].sort(
      (a, b) => (a.time ?? 0) - (b.time ?? 0),
    );
    const initialTransaction = sorted[0];
    const primaryTransaction = sorted[sorted.length - 1];
    const nonce = initialTransaction.txParams?.nonce;

    return {
      hasCancelled: sorted.some((tx) => tx.type === TransactionType.cancel),
      hasRetried: sorted.some((tx) => tx.type === TransactionType.retry),
      initialTransaction,
      nonce: nonce === undefined || nonce === null ? undefined : String(nonce),
      primaryTransaction,
      transactions: sorted,
    };
  });
}

/**
 * Returns bridge activity status override for a local bridge transaction.
 */
function getBridgeActivityStatus(
  tx: TransactionMeta,
  bridgeHistory: ReturnType<typeof selectBridgeHistoryForAccount>,
): Status | undefined {
  if (tx.type !== TransactionType.bridge) return undefined;
  const historyItem =
    bridgeHistory[tx.id] ??
    (tx.actionId ? bridgeHistory[tx.actionId] : undefined) ??
    Object.values(bridgeHistory).find(
      (item) =>
        (item as unknown as { originalTransactionId?: string })
          .originalTransactionId === tx.id,
    );

  if (!historyItem) return undefined;

  if (historyItem.status?.destChain?.txHash) {
    return 'success';
  }

  if (BRIDGE_FAIL_STATUSES.includes(tx.status)) {
    return 'failed';
  }

  return undefined;
}

/**
 * Derives source+destination token enrichment from swap metadata stored on TransactionMeta.
 */
function getSwapTokenEnrichment(
  tx: TransactionMeta,
  nativeSymbol: string | undefined,
): { sourceToken?: TokenAmount; destinationToken?: TokenAmount } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = tx as any;
  const srcSymbol: string | undefined =
    meta.sourceTokenSymbol ?? meta.swapMetaData?.token_from;
  const dstSymbol: string | undefined =
    meta.destinationTokenSymbol ?? meta.swapMetaData?.token_to;

  // For swaps where source is native, fallback to nativeSymbol if no explicit srcSymbol
  const effectiveSrcSymbol =
    srcSymbol ??
    (meta.destinationTokenAddress && nativeSymbol ? nativeSymbol : undefined);

  if (!effectiveSrcSymbol && !dstSymbol) return {};

  const sourceToken: TokenAmount | undefined = effectiveSrcSymbol
    ? { direction: 'out', symbol: effectiveSrcSymbol }
    : undefined;
  const destinationToken: TokenAmount | undefined = dstSymbol
    ? { direction: 'in', symbol: dstSymbol }
    : undefined;

  return { sourceToken, destinationToken };
}

export function useLocalActivityItems(): ActivityListItem[] {
  // Outgoing / user-initiated txs only — excludes incoming spam from TransactionController.
  const localTransactions = useSelector(selectLocalTransactions);
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  // allTokens: Record<address, Record<chainId, Token[]>>
  const allTokens = useSelector(selectAllTokens) as Record<
    string,
    Record<Hex, { symbol?: string; decimals?: number; address: string }[]>
  >;

  const transactionMetaList = useMemo(
    () => localTransactions.filter(isTransactionMetaLike),
    [localTransactions],
  );

  return useMemo(() => {
    const items: ActivityListItem[] = [];
    const accountAddress = groupEvmAccount?.address?.toLowerCase();
    const groupedTransactions = buildTransactionGroups(transactionMetaList);

    for (const baseGroup of groupedTransactions) {
      const { primaryTransaction: tx } = baseGroup;
      const txChainId = tx.chainId as Hex | undefined;

      // Native symbol from network configuration
      const chainConfig = txChainId
        ? networkConfigurations?.[txChainId]
        : undefined;
      const nativeAssetSymbol = chainConfig?.nativeCurrency;

      // Token metadata for contract interactions (ERC-20 transfers, approvals)
      const contractAddress = tx.txParams?.to?.toLowerCase();
      let contractTokenMetadata:
        | { symbol?: string; decimals?: number }
        | undefined;

      if (accountAddress && txChainId && contractAddress) {
        const chainTokens = allTokens[txChainId]?.[accountAddress as Hex] ?? [];
        const matchingToken = chainTokens.find(
          (t) => t.address?.toLowerCase() === contractAddress,
        );
        if (matchingToken) {
          contractTokenMetadata = {
            symbol: matchingToken.symbol,
            decimals: matchingToken.decimals,
          };
        }
      }

      // Bridge activity status override
      const activityStatus = getBridgeActivityStatus(tx, bridgeHistory);

      // Swap token enrichment
      const { sourceToken, destinationToken } = getSwapTokenEnrichment(
        tx,
        nativeAssetSymbol,
      );

      const isEarliestNonce = computeIsEarliestNonce(tx, transactionMetaList);

      const group: TransactionGroup = {
        ...baseGroup,
        activityStatus,
        sourceToken,
        destinationToken,
        nativeAssetSymbol,
        contractTokenMetadata,
      };

      const item = mapLocalTransaction(group, mobileActivityAdapterEnvironment);
      items.push({ ...item, isEarliestNonce });
    }

    return items;
  }, [
    transactionMetaList,
    bridgeHistory,
    networkConfigurations,
    allTokens,
    groupEvmAccount?.address,
  ]);
}
