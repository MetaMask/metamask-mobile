/**
 * Hash of a Quick Buy that the bridge controller has accepted.
 * Intent, smart-transaction, and hardware-wallet submits often return a
 * transaction meta whose `hash` is still empty. The chain hash then lives on
 * the bridge history item or the TransactionController meta. An intent with
 * no chain hash yet is identified by its order id, which is the history key.
 */
export interface QuickBuySubmittedTx {
  id?: string;
  hash?: string;
  txReceipt?: {
    transactionHash?: string;
  };
}

export interface QuickBuyBridgeHistoryItem {
  txMetaId?: string;
  originalTransactionId?: string;
  reportedSubmittedTxHash?: string;
  status?: {
    srcChain?: {
      txHash?: string;
    };
  };
}

export interface ResolveQuickBuySubmittedTxHashDependencies {
  getHistoryItem?: (key: string) => QuickBuyBridgeHistoryItem | undefined;
  historyEntries?: Iterable<[string, QuickBuyBridgeHistoryItem]>;
  getTransaction?: (id: string) => QuickBuySubmittedTx | undefined;
}

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const hashFromTransaction = (
  transaction: QuickBuySubmittedTx | null | undefined,
): string | undefined =>
  nonEmptyString(transaction?.hash) ??
  nonEmptyString(transaction?.txReceipt?.transactionHash);

const hashFromHistory = (
  item: QuickBuyBridgeHistoryItem | undefined,
  historyKey: string | undefined,
  transactionId: string,
): string | undefined => {
  const chainHash =
    nonEmptyString(item?.reportedSubmittedTxHash) ??
    nonEmptyString(item?.status?.srcChain?.txHash);
  if (chainHash) {
    return chainHash;
  }
  // Intent orders are stored under the order id, not the synthetic tx id.
  if (historyKey && historyKey !== transactionId) {
    return nonEmptyString(historyKey);
  }
  return undefined;
};

export const resolveQuickBuySubmittedTxHash = (
  submitResult: QuickBuySubmittedTx | null | undefined,
  {
    getHistoryItem,
    historyEntries,
    getTransaction,
  }: ResolveQuickBuySubmittedTxHashDependencies = {},
): string | undefined => {
  const directHash = hashFromTransaction(submitResult);
  if (directHash) {
    return directHash;
  }

  const transactionId = nonEmptyString(submitResult?.id);
  if (!transactionId) {
    return undefined;
  }

  const keyedHash = hashFromHistory(
    getHistoryItem?.(transactionId),
    transactionId,
    transactionId,
  );
  if (keyedHash) {
    return keyedHash;
  }

  if (historyEntries) {
    for (const [historyKey, item] of historyEntries) {
      const matches =
        historyKey === transactionId ||
        item.txMetaId === transactionId ||
        item.originalTransactionId === transactionId;
      if (!matches) {
        continue;
      }
      const historyHash = hashFromHistory(item, historyKey, transactionId);
      if (historyHash) {
        return historyHash;
      }
    }
  }

  return hashFromTransaction(getTransaction?.(transactionId));
};
