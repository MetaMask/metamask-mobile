import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import {
  selectPendingSmartTransactionsBySender,
  selectPendingSmartTransactionsForSelectedAccountGroup,
} from './smartTransactionsController';
import { selectEvmAddress } from './accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from './multichainAccounts/accountTreeController';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import { areAddressesEqual } from '../util/address';

interface MetaMaskPayToken {
  address: Hex;
  chainId: Hex;
}

type LocalTransaction = TransactionMeta | SmartTransaction;

function isTerminalFailedStatus(status: unknown): boolean {
  return (
    status === TransactionStatus.failed ||
    status === TransactionStatus.rejected ||
    status === TransactionStatus.dropped
  );
}

// Extracted from UnifiedTransactionsView
function dedupeTransactions(transactions: LocalTransaction[]) {
  // Pre-scan: collect nonce keys that have at least one non-terminal-failed
  // attempt (pending/submitted/confirmed). When a retry produces a fresh
  // attempt at the same nonce, prior failed attempts are suppressed so the
  // activity list shows only the latest live attempt. If every attempt is
  // terminal-failed, the failure history remains visible (deduped by id).
  const noncesWithLiveAttempt = new Set<string>();
  for (const transaction of transactions) {
    const { chainId, txParams, status, isTransfer } =
      transaction as TransactionMeta;
    if (isTransfer !== undefined) continue;
    const { from, nonce } = txParams || {};
    if (!from || nonce === undefined || nonce === null) continue;
    if (isTerminalFailedStatus(status)) continue;
    noncesWithLiveAttempt.add(
      `${chainId}-${String(from).toLowerCase()}-${nonce}`,
    );
  }

  const seenTransactions = new Set<string>();

  return transactions.filter((transaction) => {
    const { chainId, txParams, id, isTransfer, status } =
      transaction as TransactionMeta;
    const { from, nonce } = txParams || {};
    const hash = 'hash' in transaction ? transaction.hash : undefined;
    const isBridgeTransaction = transaction.type === TransactionType.bridge;
    const hasNonce = nonce !== undefined && nonce !== null;
    const isTerminalFailed = isTerminalFailedStatus(status);

    if (!from || isTransfer !== undefined) {
      return false;
    }

    const dedupeKeyPrefix = `${chainId}-${String(from).toLowerCase()}`;

    // Hide prior failed attempts when a live attempt exists at the same nonce.
    // Bridges dedupe by hash (cross-chain), so this nonce-based suppression
    // doesn't apply to them.
    if (isTerminalFailed && hasNonce && !isBridgeTransaction) {
      const nonceKey = `${dedupeKeyPrefix}-${nonce}`;
      if (noncesWithLiveAttempt.has(nonceKey)) {
        return false;
      }
    }

    // Retries reuse the same nonce. If no live attempt exists at this nonce,
    // dedupe terminal-failed txs by id so multiple failed attempts remain
    // visible side-by-side as failure history.
    const dedupeKey =
      isBridgeTransaction && hash
        ? `${dedupeKeyPrefix}-bridge-${hash.toLowerCase()}`
        : isTerminalFailed
          ? `${dedupeKeyPrefix}-${id}`
          : hasNonce
            ? `${dedupeKeyPrefix}-${nonce}`
            : `${dedupeKeyPrefix}-${id}`;

    if (seenTransactions.has(dedupeKey)) {
      return false;
    }

    seenTransactions.add(dedupeKey);
    return true;
  });
}

function getNestedTransactionTypes(
  transaction: TransactionMeta,
): TransactionType[] {
  if (!transaction.nestedTransactions) {
    return [];
  }

  return transaction.nestedTransactions
    .map((nestedTransaction) => nestedTransaction.type)
    .filter((type): type is TransactionType => Boolean(type));
}

function matchesTransactionType(
  transaction: TransactionMeta,
  transactionType: string,
): boolean {
  return (
    transaction.type === transactionType ||
    transaction.originalType === transactionType ||
    (Boolean(transaction.metamaskPay) &&
      getNestedTransactionTypes(transaction).some(
        (nestedTransactionType) => nestedTransactionType === transactionType,
      ))
  );
}

const selectTransactionControllerState = (state: RootState) =>
  state.engine.backgroundState.TransactionController;

const selectTransactionsStrict = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) => transactionControllerState.transactions,
);

const selectTransactionBatchesStrict = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) => transactionControllerState.transactionBatches,
);

export const selectRequiredTransactionIds = createSelector(
  selectTransactionsStrict,
  (transactions) =>
    new Set(transactions.flatMap((tx) => tx.requiredTransactionIds ?? [])),
);

export const selectRequiredTransactions = createSelector(
  [selectTransactionsStrict, selectRequiredTransactionIds],
  (transactions, requiredTransactionIds) =>
    transactions.filter((tx) => requiredTransactionIds.has(tx.id)),
);

export const selectRequiredTransactionHashes = createSelector(
  selectRequiredTransactions,
  (transactions) =>
    new Set(
      transactions
        .map((tx) => tx.hash?.toLowerCase())
        .filter((hash): hash is string => Boolean(hash)),
    ),
);

export const selectRelatedChainIdsByTransactionId = createSelector(
  selectTransactionsStrict,
  (transactions) => {
    const transactionsById = new Map<string, TransactionMeta>(
      transactions.map((tx) => [tx.id, tx]),
    );

    return new Map<string, string[]>(
      transactions
        .map((tx) => {
          const childChainIds = (tx.requiredTransactionIds ?? []).map(
            (childId) => transactionsById.get(childId)?.chainId,
          );

          const chainIds = [
            tx.chainId,
            tx.metamaskPay?.chainId,
            ...childChainIds,
          ]
            .filter((chainId): chainId is Hex => Boolean(chainId))
            .map((chainId) => chainId.toLowerCase());

          return [tx.id, [...new Set(chainIds)]] satisfies [string, string[]];
        })
        .filter(([, chainIds]) => chainIds.length > 0),
    );
  },
);

export const selectTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) => transactions,
  {
    devModeChecks: {
      identityFunctionCheck: 'never',
    },
  },
);

export const selectNonReplacedTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) =>
    transactions.filter(
      ({ replacedBy, replacedById, hash }) =>
        !(replacedBy && replacedById && hash),
    ),
);

export const selectSortedTransactions = createDeepEqualSelector(
  [selectNonReplacedTransactions, selectPendingSmartTransactionsBySender],
  (nonReplacedTransactions, pendingSmartTransactions) =>
    [...nonReplacedTransactions, ...pendingSmartTransactions].sort(
      (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
    ),
);

function findLatestMetaMaskPayToken(
  transactions: TransactionMeta[],
  transactionType: string | undefined,
  excludeTransactionId?: string,
): MetaMaskPayToken | undefined {
  if (!transactionType) {
    return undefined;
  }

  const latestTransaction = [...transactions]
    .reverse()
    .find(
      (transaction) =>
        (!excludeTransactionId || transaction.id !== excludeTransactionId) &&
        matchesTransactionType(transaction, transactionType) &&
        transaction.metamaskPay?.tokenAddress &&
        transaction.metamaskPay?.chainId,
    );

  const tokenAddress = latestTransaction?.metamaskPay?.tokenAddress;
  const chainId = latestTransaction?.metamaskPay?.chainId;

  if (!tokenAddress || !chainId) {
    return undefined;
  }

  return {
    address: tokenAddress,
    chainId,
  };
}

export const selectLastWithdrawTokenByType = createSelector(
  selectNonReplacedTransactions,
  (_state: RootState, transactionType?: string) => transactionType,
  (transactions, transactionType): MetaMaskPayToken | undefined =>
    findLatestMetaMaskPayToken(transactions, transactionType),
);

export const selectLastUsedPaymentMethod = createSelector(
  selectNonReplacedTransactions,
  (_state: RootState, transactionType?: string) => transactionType,
  (
    _state: RootState,
    _transactionType?: string,
    currentTransactionId?: string,
  ) => currentTransactionId,
  (
    transactions,
    transactionType,
    currentTransactionId,
  ): MetaMaskPayToken | undefined =>
    findLatestMetaMaskPayToken(
      transactions,
      transactionType,
      currentTransactionId,
    ),
);

export const selectSortedEVMTransactionsForSelectedAccountGroup =
  createDeepEqualSelector(
    [
      selectNonReplacedTransactions,
      selectPendingSmartTransactionsForSelectedAccountGroup,
    ],
    (sortedTransactions, pendingSmartTransactions) =>
      [...sortedTransactions, ...pendingSmartTransactions].sort(
        (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
      ),
  );

export const selectLocalTransactions = createDeepEqualSelector(
  [
    selectNonReplacedTransactions,
    selectPendingSmartTransactionsForSelectedAccountGroup,
    selectSelectedAccountGroupEvmInternalAccount,
    selectEvmAddress,
    selectRequiredTransactionIds,
  ],
  (
    nonReplacedTransactions,
    pendingSmartTransactions,
    groupEvmAccount,
    fallbackEvmAddress,
    requiredTransactionIds,
  ) => {
    const activeEvmAddress = groupEvmAccount?.address ?? fallbackEvmAddress;

    const transactions = nonReplacedTransactions.filter((transaction) => {
      if (requiredTransactionIds.has(transaction.id)) {
        return false;
      }

      const fromAddress = transaction.txParams?.from;
      if (!fromAddress || !activeEvmAddress) {
        return false;
      }

      return areAddressesEqual(fromAddress, activeEvmAddress);
    });

    const pendingSmartTransactionsForActiveAddress =
      pendingSmartTransactions.filter((transaction) => {
        const fromAddress = transaction.txParams?.from;
        if (!fromAddress || !activeEvmAddress) {
          return false;
        }

        return areAddressesEqual(fromAddress, activeEvmAddress);
      });

    return dedupeTransactions([
      ...transactions,
      ...pendingSmartTransactionsForActiveAddress,
    ]).sort((a, b) => (b?.time ?? 0) - (a?.time ?? 0));
  },
);

export const selectSwapsTransactions = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) =>
    //@ts-expect-error - This is populated at the app level, the TransactionController is not aware of this property
    transactionControllerState.swapsTransactions ?? {},
);

export const selectTransactionMetadataById = createDeepEqualSelector(
  selectTransactionsStrict,
  (_: RootState, id: string) => id,
  (transactions, id) => transactions.find((tx) => tx.id === id),
);

export const selectTransactionBatchMetadataById = createDeepEqualSelector(
  selectTransactionBatchesStrict,
  (_: RootState, id: string) => id,
  (transactionBatches, id) => transactionBatches?.find((tx) => tx.id === id),
);

export const selectTransactionsByIds = createSelector(
  selectTransactionsStrict,
  (_: RootState, ids: string[]) => ids,
  (transactions, ids) =>
    ids
      .map((id) => transactions.find((tx) => tx.id === id))
      .filter(Boolean) as TransactionMeta[],
);

export const selectTransactionsByBatchId = createSelector(
  selectTransactionsStrict,
  (_: RootState, batchId: string) => batchId,
  (transactions, batchId) =>
    transactions.filter((tx) => tx.batchId === batchId),
);
