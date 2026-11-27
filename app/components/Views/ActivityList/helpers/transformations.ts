/**
 * Transformation helpers for the UnifiedTransactionsView.
 * Produces ActivityListItem[] from API EVM and non-EVM transaction sources.
 * Local EVM transactions are handled separately by useLocalActivityItems.
 */
import {
  mapKeyringTransaction,
  mapV5ApiTransaction,
} from '@metamask/client-utils';
import {
  type V1TransactionByHashResponse,
  type V5MultiAccountTransactionsResponse,
  type V5TransactionRecord,
} from '@metamask/core-backend';
import { isCrossChain } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import type { CaipAssetType } from '@metamask/utils';
import type { InfiniteData } from '@tanstack/react-query';
import {
  type ActivityListItem,
  classifyKeyringStakingActivity,
  classifyPooledStakingActivity,
} from '../../../../util/activity-adapters';
import { mergeActivityItems } from '../../../../util/activity-adapters/adapters/dedup';
import { equalsIgnoreCase } from '../../../../util/string';
import { applyBridgeQuote } from './apply-bridge-quote';

export type { ActivityListItem };

const getOriginalTransactionId = (bridgeHistoryItem: BridgeHistoryItem) =>
  (bridgeHistoryItem as unknown as { originalTransactionId?: string })
    .originalTransactionId;

export const isBridgeHistoryForEvmTransaction = (
  tx: { id?: string; actionId?: string; hash?: string },
  bridgeHistoryValues: BridgeHistoryItem[],
) =>
  bridgeHistoryValues.some((bridgeHistoryItem) => {
    const originalTransactionId = getOriginalTransactionId(bridgeHistoryItem);
    return (
      bridgeHistoryItem.txMetaId === tx.id ||
      bridgeHistoryItem.txMetaId === tx.actionId ||
      originalTransactionId === tx.id ||
      originalTransactionId === tx.actionId ||
      equalsIgnoreCase(bridgeHistoryItem.status?.srcChain?.txHash, tx.hash)
    );
  });

/**
 * Participation gate shared by the activity list and the Activity details
 * by-hash lookup: excluded hashes, transactions the subject does not take part
 * in at the top level, and no-op self transfers.
 *
 * `address` must already be lowercased.
 */
export function shouldSkipUnrelatedTransaction(
  address: string,
  transaction: V1TransactionByHashResponse,
  excludedTxHashes?: Set<string>,
) {
  const rawFrom = transaction.from?.toLowerCase();
  const rawTo = transaction.to?.toLowerCase();
  const hash = transaction.hash?.toLowerCase();
  const hasTopLevelAddressMatch = rawFrom === address || rawTo === address;

  if (hash && excludedTxHashes?.has(hash)) {
    return true;
  }

  if (!hasTopLevelAddressMatch) {
    return true;
  }

  return (
    rawFrom === address &&
    rawTo === address &&
    transaction.value === '0' &&
    !transaction.valueTransfers?.length &&
    (!transaction.methodId || transaction.methodId === '0x')
  );
}

// Ported from Extension
export function isZeroValueSelfSend(
  transaction: V5TransactionRecord,
  subjectAddress: string,
) {
  const { tx, valueTransfers } = transaction;

  return (
    equalsIgnoreCase(tx.from, subjectAddress) &&
    equalsIgnoreCase(tx.to ?? '', subjectAddress) &&
    tx.value === '0' &&
    !valueTransfers.length &&
    (!tx.methodId || tx.methodId === '0x')
  );
}

// Ported from Extension
export function isExcludedTransactionHash(
  transaction: V5TransactionRecord,
  txHashes?: Set<string>,
) {
  return Boolean(
    transaction.tx.id && txHashes?.has(transaction.tx.id.toLowerCase()),
  );
}

export function mapV5ActivityItem(transaction: V5TransactionRecord) {
  const activity = mapV5ApiTransaction({ transaction }) as ActivityListItem;
  const { chainId, to, methodId } = transaction.tx;

  return classifyPooledStakingActivity(
    { chainId: Number(chainId.split(':')[1]), to, methodId },
    activity,
  );
}

export function activityMatchesAssetId(
  item: ActivityListItem,
  assetId: CaipAssetType,
): boolean {
  const { data } = item;
  const tokenAssetIds = [
    'token' in data ? data.token?.assetId : undefined,
    'sourceToken' in data ? data.sourceToken?.assetId : undefined,
    'destinationToken' in data ? data.destinationToken?.assetId : undefined,
  ];
  return tokenAssetIds.some((id) => id && equalsIgnoreCase(id, assetId));
}

export function selectApiEvmTransactions({
  address,
  excludedTxHashes,
  assetId,
}: {
  address: string;
  excludedTxHashes?: Set<string>;
  assetId?: CaipAssetType;
}) {
  return (data: InfiniteData<V5MultiAccountTransactionsResponse>) => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data
        .filter(
          (transaction) =>
            !isZeroValueSelfSend(transaction, address) &&
            !isExcludedTransactionHash(transaction, excludedTxHashes),
        )
        .map(mapV5ActivityItem)
        .filter(
          (activity) => !assetId || activityMatchesAssetId(activity, assetId),
        ),
    })),
  });
}

export function mapNonEvmTransactions(
  transactions: NonEvmTransaction[],
  getBridgeHistoryItem?: (txId: string) => BridgeHistoryItem | undefined,
  getSubjectAddress?: (transaction: NonEvmTransaction) => string | undefined,
): ActivityListItem[] {
  return transactions.map((transaction) => {
    const subjectAddress = getSubjectAddress?.(transaction);
    const activity = classifyKeyringStakingActivity(transaction, {
      ...mapKeyringTransaction({
        transaction: {
          ...transaction,
          fees: transaction.fees ?? [],
        },
        subjectAddress,
      }),
    } as ActivityListItem);
    const bridgeHistoryItem = getBridgeHistoryItem?.(transaction.id);
    const quote = bridgeHistoryItem?.quote;

    if (quote && isCrossChain(quote.srcChainId, quote.destChainId)) {
      return applyBridgeQuote(activity, bridgeHistoryItem, subjectAddress);
    }

    return activity;
  });
}

/**
 * Merges and sorts all transaction sources into a single ActivityListItem list.
 * Dedup precedence by hash: perps/predict/ramp > API-confirmed EVM > local EVM
 * > non-EVM (see mergeActivityItems).
 */
export function mergeTransactionsByTime(
  localItems: ActivityListItem[],
  confirmedEvmItems: ActivityListItem[],
  nonEvmItems: ActivityListItem[],
  perpsItems: ActivityListItem[] = [],
  predictItems: ActivityListItem[] = [],
  rampItems: ActivityListItem[] = [],
): ActivityListItem[] {
  return mergeActivityItems(
    localItems,
    confirmedEvmItems,
    nonEvmItems,
    perpsItems,
    predictItems,
    rampItems,
  );
}
