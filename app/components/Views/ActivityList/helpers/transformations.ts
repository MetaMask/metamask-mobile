/**
 * Transformation helpers for the UnifiedTransactionsView.
 * Produces ActivityListItem[] from API EVM and non-EVM transaction sources.
 * Local EVM transactions are handled separately by useLocalActivityItems.
 */
import {
  mapApiTransaction,
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
import type { InfiniteData } from '@tanstack/react-query';
import {
  type ActivityListItem,
  classifyKeyringStakingActivity,
  classifyPooledStakingActivity,
} from '../../../../util/activity-adapters';
import { mergeActivityItems } from '../../../../util/activity-adapters/adapters/dedup';
import { equalsIgnoreCase } from '../../../../util/string';
import { applyBridgeQuote } from './apply-bridge-quote';
import {
  getPooledStakingFieldsFromV5Transaction,
  shouldSkipV5Transaction,
} from './v5-transaction-filters';

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

/**
 * List gate. Drops excluded hashes, transactions the subject does not take
 * part in at the top level, and no-op self transfers.
 *
 * Details must not reuse this gate: the by-hash request always asks for
 * `includeValueTransfers`, so a plain receive the user explicitly opened would
 * be filtered out and render as not-found.
 */
export function shouldSkipTransaction(
  address: string,
  transaction: V1TransactionByHashResponse,
  excludedTxHashes?: Set<string>,
) {
  return shouldSkipUnrelatedTransaction(address, transaction, excludedTxHashes);
}

function transformV5ApiTransactions(
  address: string,
  transactions: V5TransactionRecord[],
  excludedTxHashes?: Set<string>,
): ActivityListItem[] {
  const items: ActivityListItem[] = [];
  const subjectAddress = address.toLowerCase();

  for (const transaction of transactions) {
    if (
      shouldSkipV5Transaction(subjectAddress, transaction, excludedTxHashes)
    ) {
      continue;
    }
    const activity = mapV5ApiTransaction({
      transaction,
    }) as ActivityListItem;
    items.push(
      classifyPooledStakingActivity(
        getPooledStakingFieldsFromV5Transaction(transaction),
        activity,
      ),
    );
  }

  return items;
}

export function selectApiEvmTransactions({
  address,
  excludedTxHashes,
}: {
  address: string;
  excludedTxHashes?: Set<string>;
}) {
  return (data: InfiniteData<V5MultiAccountTransactionsResponse>) => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: transformV5ApiTransactions(address, page.data, excludedTxHashes),
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
