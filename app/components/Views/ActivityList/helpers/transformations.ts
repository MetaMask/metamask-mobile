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

export function mapV5ActivityItem(
  transaction: V5TransactionRecord,
  subjectAddress?: string,
) {
  const activity = mapV5ApiTransaction({ transaction }) as ActivityListItem;
  const { chainId, to, methodId } = transaction.tx;

  const classified = classifyPooledStakingActivity(
    { chainId: Number(chainId.split(':')[1]), to, methodId },
    activity,
  );

  return subjectAddress
    ? reclassifySpoofedSend(classified, transaction, subjectAddress)
    : classified;
}

/**
 * Address-poisoning guard for API activity items.
 *
 * The Accounts API indexes Transfer logs, so a scam contract can emit a
 * Transfer event that names the subject as `from` without the subject ever
 * signing the transaction. The mapper labels that log a `send` because it
 * only looks at the log. A transfer only counts as the subject's send when
 * the subject signed the underlying transaction, i.e. the transaction's
 * real `from` is the subject.
 *
 * When the signer is someone else, the row is reclassified as a contract
 * interaction (the rendering Desktop already uses for such transactions)
 * instead of being dropped: the transaction is real and mentions the
 * subject, it just was not sent by them. The log-derived token amount is
 * kept, matching the mapper's own contract-interaction fallback; the
 * misleading part was the "Sent" label and the subject shown as sender,
 * both of which are gone (the row shows the real signer and the contract).
 *
 * Relayed transfers (a relayer submitting a transaction the subject
 * authorised) also land here when there is no local copy; the list and
 * details views prefer a local `send` row for the same hash, so a relayed
 * send submitted through this wallet still renders as a send.
 */
export function reclassifySpoofedSend(
  activity: ActivityListItem,
  transaction: V5TransactionRecord,
  subjectAddress: string,
): ActivityListItem {
  if (activity.type !== 'send') {
    return activity;
  }

  const signer = transaction.tx.from;
  if (!signer || equalsIgnoreCase(signer, subjectAddress)) {
    return activity;
  }

  const { token, fees } = activity.data;
  const { to, methodId, transactionCategory, transactionProtocol } =
    transaction.tx;

  return {
    ...activity,
    type: 'contractInteraction',
    data: {
      from: signer,
      to: to ?? activity.data.to ?? '',
      ...(token ? { token } : {}),
      ...(fees ? { fees } : {}),
      ...(methodId ? { methodId } : {}),
      ...(transactionCategory ? { transactionCategory } : {}),
      ...(transactionProtocol ? { transactionProtocol } : {}),
    },
  };
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
      data: page.data
        .filter(
          (transaction) =>
            !isZeroValueSelfSend(transaction, address) &&
            !isExcludedTransactionHash(transaction, excludedTxHashes),
        )
        .map((transaction) => mapV5ActivityItem(transaction, address)),
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
