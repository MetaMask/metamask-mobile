import { createSelector } from 'reselect';
import { formatAccountToCaipAccountId } from '@metamask/perps-controller';
import { mapLocalTransaction } from '@metamask/client-utils';
import {
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
  getBridgeActivityStatus,
  getSwapTokenEnrichment,
  prepareLocalTransactionGroup,
  type ActivityListItem,
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

// Same nonce = one row. A speed-up or cancel is not a second activity item.
// Use the original for type/amount; use the retry/cancel for status.
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
      sortedRepresentatives.at(-1) ?? initialTransaction;
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

    transactionGroups.forEach((group, index) => {
      const item = items[index];
      if (!item) {
        return;
      }

      for (const tx of [group.primaryTransaction, group.initialTransaction]) {
        const hash = tx.hash?.toLowerCase();
        if (hash) {
          itemsByIdentifier.set(hash, item);
        }

        if (typeof tx.id === 'string' || typeof tx.id === 'number') {
          itemsByIdentifier.set(String(tx.id).toLowerCase(), item);
        }
      }
    });

    return itemsByIdentifier;
  },
);
