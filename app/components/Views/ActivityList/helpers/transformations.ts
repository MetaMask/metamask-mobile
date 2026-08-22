/**
 * Transformation helpers for the UnifiedTransactionsView.
 * Produces ActivityListItem[] from API EVM and non-EVM transaction sources.
 * Local EVM transactions are handled separately by useLocalActivityItems.
 */
import {
  mapApiTransaction,
  mapKeyringTransaction,
} from '@metamask/client-utils';
import {
  type V1TransactionByHashResponse,
  type V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import { isCrossChain } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import type { InfiniteData } from '@tanstack/react-query';
import { type ActivityListItem } from '../../../../util/activity-adapters';
import { mergeActivityItems } from '../../../../util/activity-adapters/adapters/dedup';
import { equalsIgnoreCase } from '../../../../util/string';
import { applyBridgeQuote } from './apply-bridge-quote';

export type { ActivityListItem };

const excludedTransactionTypes = ['SPAM_TOKEN_TRANSFER'];

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

function isIncomingTokenTransfer(
  address: string,
  transaction: V1TransactionByHashResponse,
) {
  const normalizedAddress = address.toLowerCase();

  return (
    (transaction.valueTransfers?.some(
      (transfer) =>
        Boolean(transfer.contractAddress) &&
        transfer.to?.toLowerCase() === normalizedAddress &&
        transfer.from?.toLowerCase() !== normalizedAddress,
    ) ??
      false) &&
    transaction.from?.toLowerCase() !== normalizedAddress
  );
}

function isNativeValueTransfer(
  transfer: NonNullable<V1TransactionByHashResponse['valueTransfers']>[number],
) {
  const transferType = transfer.transferType?.toLowerCase();
  return (
    !transfer.contractAddress &&
    (transferType === 'native' || transferType === 'normal')
  );
}

function isIncomingNativeTransfer(
  address: string,
  transaction: V1TransactionByHashResponse,
) {
  const normalizedAddress = address.toLowerCase();
  let hasOutgoingTransfer = false;
  let hasIncomingNativeTransfer = false;

  for (const transfer of transaction.valueTransfers ?? []) {
    if (
      !hasOutgoingTransfer &&
      transfer.from?.toLowerCase() === normalizedAddress
    ) {
      hasOutgoingTransfer = true;
    }

    if (
      !hasIncomingNativeTransfer &&
      transfer.to?.toLowerCase() === normalizedAddress &&
      isNativeValueTransfer(transfer)
    ) {
      hasIncomingNativeTransfer = true;
    }

    if (hasOutgoingTransfer && hasIncomingNativeTransfer) {
      break;
    }
  }

  return hasIncomingNativeTransfer && !hasOutgoingTransfer;
}

export function shouldSkipTransaction(
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

  if (excludedTransactionTypes.includes(transaction.transactionType ?? '')) {
    return true;
  }

  if (
    rawFrom === address &&
    rawTo === address &&
    transaction.value === '0' &&
    !transaction.valueTransfers?.length &&
    (!transaction.methodId || transaction.methodId === '0x')
  ) {
    return true;
  }

  return (
    isIncomingTokenTransfer(address, transaction) ||
    (rawFrom !== address && isIncomingNativeTransfer(address, transaction))
  );
}

// The Accounts API labels the outgoing leg of a bridge `BRIDGE_OUT`, but the
// shared mapper only recognises `BRIDGE_WITHDRAW` as an outgoing bridge, so a
// `BRIDGE_OUT` transaction falls through to `contractInteraction` and the row
// ends up rendering as a send. Aliasing the category keeps the bridge
// classification (and its source token and fees) without forking the mapper.
function withBridgeCategoryAlias(
  transaction: V1TransactionByHashResponse,
): V1TransactionByHashResponse {
  return transaction.transactionCategory === 'BRIDGE_OUT'
    ? { ...transaction, transactionCategory: 'BRIDGE_WITHDRAW' }
    : transaction;
}

function transformApiTransactions(
  address: string,
  transactions: V1TransactionByHashResponse[],
  excludedTxHashes?: Set<string>,
): ActivityListItem[] {
  const items: ActivityListItem[] = [];
  const subjectAddress = address.toLowerCase();

  for (const tx of transactions) {
    if (shouldSkipTransaction(subjectAddress, tx, excludedTxHashes)) {
      continue;
    }
    items.push({
      ...mapApiTransaction({
        subjectAddress,
        transaction: withBridgeCategoryAlias(tx),
      }),
      raw: { type: 'apiEvmTransaction' as const, data: tx },
    } as ActivityListItem);
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
  return (data: InfiniteData<V4MultiAccountTransactionsResponse>) => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: transformApiTransactions(address, page.data, excludedTxHashes),
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
    const activity = {
      ...mapKeyringTransaction({
        transaction: {
          ...transaction,
          fees: transaction.fees ?? [],
        },
        subjectAddress,
      }),
      raw: { type: 'keyringTransaction' as const, data: transaction },
    } as ActivityListItem;
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
