import { createSelector } from 'reselect';
import { formatAccountToCaipAccountId } from '@metamask/perps-controller';
import { mapLocalTransaction } from '@metamask/client-utils';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { parseCaipChainId, type CaipChainId, type Hex } from '@metamask/utils';
import type { RootState } from '../reducers';
import { selectSelectedAccountGroupEvmInternalAccount } from './multichainAccounts/accountTreeController';
import {
  selectLocalTransactions,
  selectReplacedLocalTransactions,
  selectRequiredTransactions,
} from './transactionController';
import { selectBridgeHistoryForAccount } from './bridgeStatusController';
import { selectEvmNetworkConfigurationsByChainId } from './networkController';
import { selectAllTokens } from './tokensController';
import { selectTransactionPayTransactionData } from './transactionPayController';
import { findBridgeHistoryItem } from '../util/bridge/findBridgeHistoryItem';
import { isHardwareAccount } from '../util/address';
import {
  enrichLocalActivity,
  prepareLocalTransactionGroup,
  type ActivityListItem,
  type TokenAmount,
} from '../util/activity-adapters';

const selectCaipChainId = (_state: RootState, caipChainId: CaipChainId) =>
  caipChainId;

export const selectSelectedAccountCaipId = createSelector(
  [selectSelectedAccountGroupEvmInternalAccount, selectCaipChainId],
  (account, caipChainId) => {
    if (!account?.address) {
      return undefined;
    }

    const { reference } = parseCaipChainId(caipChainId);
    return (
      formatAccountToCaipAccountId(account.address, reference) ?? undefined
    );
  },
);

type GroupMember = TransactionMeta & { isSmartTransaction?: boolean };

const bridgeFailStatuses = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
] as string[];

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

function getTransactionGroupKey(tx: TransactionMeta) {
  const chainId = tx.chainId?.toLowerCase() ?? 'unknown-chain';
  const from = tx.txParams?.from?.toLowerCase() ?? 'unknown-from';
  const nonce = tx.txParams?.nonce;

  if (nonce !== undefined && nonce !== null) {
    return `${chainId}:${from}:${nonce}`;
  }

  return `${chainId}:${from}:${tx.id}`;
}

// Speed-up/cancel originals join an existing nonce group — they must not
// create a row. Earliest attempt sets type/amount; latest survivor sets status.
function buildTransactionGroups(
  transactions: GroupMember[],
  replacedTransactions: TransactionMeta[] = [],
) {
  const groupsByKey = new Map<
    string,
    { representatives: GroupMember[]; replaced: GroupMember[] }
  >();

  for (const tx of transactions) {
    const key = getTransactionGroupKey(tx);
    const entry = groupsByKey.get(key) ?? { representatives: [], replaced: [] };
    entry.representatives.push(tx);
    groupsByKey.set(key, entry);
  }

  for (const tx of replacedTransactions) {
    groupsByKey.get(getTransactionGroupKey(tx))?.replaced.push(tx);
  }

  return [...groupsByKey.values()].map(({ representatives, replaced }) => {
    const sortedRepresentatives = [...representatives].sort(
      (left, right) => (left.time ?? 0) - (right.time ?? 0),
    );
    const sorted = replaced.length
      ? [...replaced, ...sortedRepresentatives].sort(
          (left, right) => (left.time ?? 0) - (right.time ?? 0),
        )
      : sortedRepresentatives;
    const initialTransaction = sorted[0];
    const primaryTransaction =
      sortedRepresentatives[sortedRepresentatives.length - 1];
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

// The source tx confirms before the destination does. Treat the bridge as
// success only after destChain.txHash; if the source failed, mark failed.
export function getBridgeActivityStatus(
  tx: TransactionMeta,
  bridgeHistoryItem: BridgeHistoryItem | undefined,
) {
  if (tx.type !== TransactionType.bridge || !bridgeHistoryItem) {
    return undefined;
  }

  if (bridgeHistoryItem.status?.destChain?.txHash) {
    return 'success';
  }

  if (bridgeFailStatuses.includes(tx.status)) {
    return 'failed';
  }

  return undefined;
}

function tokenFromQuoteAsset(
  direction: TokenAmount['direction'],
  asset: { symbol?: string; decimals?: number; assetId?: string } | undefined,
  amount: string | undefined,
) {
  if (!asset?.symbol) {
    return undefined;
  }
  return {
    direction,
    symbol: asset.symbol,
    ...(amount ? { amount } : {}),
    ...(asset.decimals === undefined ? {} : { decimals: asset.decimals }),
    ...(asset.assetId ? { assetId: asset.assetId } : {}),
  };
}

// Prefer the bridge/swaps quote (has amounts). Fall back to legacy
// TransactionMeta symbols for older swaps with no quote.
export function getSwapTokenEnrichment(
  tx: TransactionMeta,
  nativeSymbol: string | undefined,
  bridgeHistoryItem: BridgeHistoryItem | undefined,
) {
  const quote = bridgeHistoryItem?.quote;
  const quoteSourceToken = tokenFromQuoteAsset(
    'out',
    quote?.srcAsset,
    quote?.srcTokenAmount,
  );
  const quoteDestinationToken = tokenFromQuoteAsset(
    'in',
    quote?.destAsset,
    quote?.destTokenAmount ?? quote?.minDestTokenAmount,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = tx as any;
  const srcSymbol: string | undefined =
    meta.sourceTokenSymbol ?? meta.swapMetaData?.token_from;
  const dstSymbol: string | undefined =
    meta.destinationTokenSymbol ?? meta.swapMetaData?.token_to;
  const effectiveSrcSymbol =
    srcSymbol ??
    (meta.destinationTokenAddress && nativeSymbol ? nativeSymbol : undefined);

  return {
    sourceToken:
      quoteSourceToken ??
      (effectiveSrcSymbol
        ? { direction: 'out' as const, symbol: effectiveSrcSymbol }
        : undefined),
    destinationToken:
      quoteDestinationToken ??
      (dstSymbol ? { direction: 'in' as const, symbol: dstSymbol } : undefined),
  };
}

const selectLocalTransactionMetas = createSelector(
  [selectLocalTransactions],
  (localTransactions) => localTransactions.filter(isTransactionMetaLike),
);

export const selectLocalTransactionGroups = createSelector(
  [selectLocalTransactionMetas, selectReplacedLocalTransactions],
  buildTransactionGroups,
);

export const selectLocalActivityItems = createSelector(
  [
    selectLocalTransactionGroups,
    selectRequiredTransactions,
    selectBridgeHistoryForAccount,
    selectEvmNetworkConfigurationsByChainId,
    selectAllTokens,
    selectSelectedAccountGroupEvmInternalAccount,
    selectTransactionPayTransactionData,
  ],
  (
    transactionGroups,
    requiredTransactions,
    bridgeHistory,
    networkConfigurations,
    allTokens,
    groupEvmAccount,
    transactionPayData,
  ) => {
    const groupEvmAccountAddress = groupEvmAccount?.address;
    const accountAddress = groupEvmAccountAddress?.toLowerCase();
    const isHardwareWalletAccount = Boolean(
      accountAddress && isHardwareAccount(accountAddress),
    );
    const requiredTransactionsById = new Map(
      requiredTransactions.map((transaction) => [transaction.id, transaction]),
    );
    const tokensByChain = allTokens as Record<
      string,
      Record<Hex, { symbol?: string; decimals?: number; address: string }[]>
    >;

    return transactionGroups.map((baseGroup) => {
      const { primaryTransaction: tx } = baseGroup;
      const txChainId = tx.chainId as Hex | undefined;
      const nativeAssetSymbol = txChainId
        ? networkConfigurations?.[txChainId]?.nativeCurrency
        : undefined;
      const contractAddress = tx.txParams?.to?.toLowerCase();
      const matchingToken =
        accountAddress && txChainId && contractAddress
          ? tokensByChain[txChainId]?.[accountAddress as Hex]?.find(
              (token) => token.address?.toLowerCase() === contractAddress,
            )
          : undefined;
      const bridgeHistoryItem = findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        transactionActionId: tx.actionId,
        transactionHash: tx.hash,
      });
      const prepared = prepareLocalTransactionGroup({
        ...baseGroup,
        activityAccountAddress: groupEvmAccountAddress,
        relatedTransactions: (tx.requiredTransactionIds ?? [])
          .map((id) => requiredTransactionsById.get(id))
          .filter(
            (transaction): transaction is TransactionMeta =>
              transaction !== undefined,
          ),
        transactionPayData: transactionPayData[tx.id],
        activityStatus: getBridgeActivityStatus(tx, bridgeHistoryItem),
        ...getSwapTokenEnrichment(tx, nativeAssetSymbol, bridgeHistoryItem),
        nativeAssetSymbol,
        contractTokenMetadata: matchingToken
          ? {
              symbol: matchingToken.symbol,
              decimals: matchingToken.decimals,
            }
          : undefined,
        isHardwareWalletAccount,
      });

      return enrichLocalActivity(
        mapLocalTransaction(
          prepared as Parameters<typeof mapLocalTransaction>[0],
        ) as ActivityListItem,
        prepared,
      );
    });
  },
);

export const selectLocalActivityItemsByIdentifier = createSelector(
  [selectLocalTransactionGroups, selectLocalActivityItems],
  (transactionGroups, items) => {
    const itemsByIdentifier = new Map<string, ActivityListItem>();

    transactionGroups.forEach((transactionGroup, index) => {
      const item = items[index];
      if (!item) {
        return;
      }

      for (const transaction of [
        transactionGroup.primaryTransaction,
        transactionGroup.initialTransaction,
      ]) {
        const hash = transaction.hash?.toLowerCase();
        if (hash) {
          itemsByIdentifier.set(hash, item);
        }

        if (
          typeof transaction.id === 'string' ||
          typeof transaction.id === 'number'
        ) {
          itemsByIdentifier.set(String(transaction.id).toLowerCase(), item);
        }
      }
    });

    return itemsByIdentifier;
  },
);
