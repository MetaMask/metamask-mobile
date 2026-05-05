import {
  type V1TransactionByHashResponse,
  type V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import type { InfiniteData } from '@tanstack/react-query';
import { normalizeTransaction } from './adapters';
import {
  EvmTransaction,
  TransactionKind,
  TransactionViewModel,
  UnifiedItem,
} from '../types';
import { equalsIgnoreCase } from '../../../../util/string';

const excludedTransactionTypes = ['SPAM_TOKEN_TRANSFER'];

const getOriginalTransactionId = (bridgeHistoryItem: BridgeHistoryItem) =>
  (bridgeHistoryItem as unknown as { originalTransactionId?: string })
    .originalTransactionId;

export const isBridgeHistoryForEvmTransaction = (
  tx: EvmTransaction & { actionId?: string; hash?: string },
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
  return (
    transaction.valueTransfers?.some(
      (transfer) =>
        Boolean(transfer.contractAddress) &&
        transfer.to?.toLowerCase() === address &&
        transaction.from?.toLowerCase() !== address,
    ) ?? false
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
      !transfer.contractAddress
    ) {
      hasIncomingNativeTransfer = true;
    }

    if (hasOutgoingTransfer && hasIncomingNativeTransfer) {
      break;
    }
  }

  return hasIncomingNativeTransfer && !hasOutgoingTransfer;
}

function shouldSkipTransaction(
  address: string,
  transaction: V1TransactionByHashResponse,
) {
  const rawFrom = transaction.from?.toLowerCase();
  const rawTo = transaction.to?.toLowerCase();

  if (rawFrom !== address && rawTo !== address) {
    return true;
  }

  // Filter out span token transfers
  if (excludedTransactionTypes.includes(transaction.transactionType ?? '')) {
    return true;
  }

  // Filter out zero-value self-sends with no calldata and no transfers
  if (
    rawFrom === address &&
    rawTo === address &&
    transaction.value === '0' &&
    !transaction.valueTransfers?.length &&
    (!transaction.methodId || transaction.methodId === '0x')
  ) {
    return true;
  }

  // Filter out incoming native token transfers
  if (isIncomingTokenTransfer(address, transaction)) {
    return true;
  }

  return rawFrom !== address && isIncomingNativeTransfer(address, transaction);
}

function transformTransactions(
  address: string,
  transactions: V1TransactionByHashResponse[],
): TransactionViewModel[] {
  const filteredTransactions = [];

  for (const tx of transactions) {
    if (shouldSkipTransaction(address, tx)) {
      continue;
    }

    filteredTransactions.push(tx);
  }

  return filteredTransactions.map((tx) => {
    const transactionMeta = normalizeTransaction(address, tx);

    return {
      // Intent is to use the API response more directly
      ...tx,
      // But for now, we keep this until we can refactor the UI components
      id: transactionMeta.id,
      time: transactionMeta.time,
      hexChainId: transactionMeta.chainId,
      transactionMeta,
    };
  });
}

export function selectTransactions({ address }: { address: string }) {
  return (data: InfiniteData<V4MultiAccountTransactionsResponse>) => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: transformTransactions(address, page.data),
    })),
  });
}

const getEvmTime = (tx: EvmTransaction) => tx.time ?? 0;
const getNonEvmTime = (tx: NonEvmTransaction) => (tx.timestamp ?? 0) * 1000;
const getEvmHash = (tx: EvmTransaction) =>
  'hash' in tx && typeof tx.hash === 'string' ? tx.hash.toLowerCase() : '';

// Merges local EVM, API-confirmed EVM and non-EVM transactions into one list
// sorted by time (newest first), deduplicated by hash (API-confirmed wins).
export function mergeTransactionsByTime(
  evmLocalTransactions: EvmTransaction[],
  evmConfirmedTransactions: TransactionViewModel[],
  nonEvmTransactions: NonEvmTransaction[],
) {
  const seenHashes = new Set<string>();

  const confirmedItems: UnifiedItem[] = [];
  for (const tx of evmConfirmedTransactions) {
    const hash = tx.hash?.toLowerCase();
    if (hash) {
      if (seenHashes.has(hash)) {
        continue;
      }
      seenHashes.add(hash);
    }
    confirmedItems.push({
      kind: TransactionKind.ConfirmedEvm,
      tx,
      time: tx.time ?? 0,
    });
  }

  const localItems: UnifiedItem[] = [];
  for (const tx of evmLocalTransactions) {
    const hash = getEvmHash(tx);
    if (hash) {
      if (seenHashes.has(hash)) {
        continue;
      }
      seenHashes.add(hash);
    }
    localItems.push({
      kind: TransactionKind.Evm,
      tx,
      time: getEvmTime(tx),
    });
  }

  const nonEvmItems: UnifiedItem[] = nonEvmTransactions.map((tx) => ({
    kind: TransactionKind.NonEvm,
    tx,
    time: getNonEvmTime(tx),
  }));

  return [...localItems, ...confirmedItems, ...nonEvmItems].sort(
    (a, b) => b.time - a.time,
  );
}
