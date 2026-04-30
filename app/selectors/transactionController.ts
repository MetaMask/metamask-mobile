import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import {
  selectPendingSmartTransactionsBySender,
  selectPendingSmartTransactionsForSelectedAccountGroup,
} from './smartTransactionsController';
import { selectEvmAddress } from './accountsController';
import {
  TransactionMeta,
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

const transactionPendingStatuses = new Set([
  'submitted',
  'signed',
  'unapproved',
  'approved',
  'pending',
]);

// Extracted from UnifiedTransactionsView
function dedupeTransactions(transactions: LocalTransaction[]) {
  const seenTransactions = new Set<string>();

  return transactions.filter((transaction) => {
    const { chainId, txParams } = transaction;
    const { from, nonce, actionId } = txParams || {};
    const hasNonce = nonce !== undefined && nonce !== null;

    if (!from) {
      return false;
    }

    const dedupeKeyPrefix = `${chainId}-${String(from).toLowerCase()}`;
    const dedupeKey = hasNonce
      ? `${dedupeKeyPrefix}-${nonce}`
      : `${dedupeKeyPrefix}-${actionId}`;

    // Keep only the first local pending transaction for each dedupe key
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

export const selectLastWithdrawTokenByType = createSelector(
  selectNonReplacedTransactions,
  (_state: RootState, transactionType?: string) => transactionType,
  (transactions, transactionType): MetaMaskPayToken | undefined => {
    if (!transactionType) {
      return undefined;
    }

    const latestTransaction = [...transactions]
      .reverse()
      .find(
        (transaction) =>
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
  },
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
    selectEvmAddress,
  ],
  (nonReplacedTransactions, pendingSmartTransactions, activeEvmAddress) => {
    const pendingTransactions = nonReplacedTransactions.filter(
      (transaction) => {
        // Only keep local EVM transactions that are pending-like
        // Extracted from UnifiedTransactionsView submittedTxs filter
        if (!transactionPendingStatuses.has(transaction.status)) {
          return false;
        }

        const fromAddress = transaction.txParams?.from;
        if (!fromAddress || !activeEvmAddress) {
          return false;
        }

        // Only keep pending transactions sent from the active EVM account
        return areAddressesEqual(fromAddress, activeEvmAddress);
      },
    );

    const pendingSmartTransactionsForActiveAddress =
      pendingSmartTransactions.filter((transaction) => {
        const fromAddress = transaction.txParams?.from;
        if (!fromAddress || !activeEvmAddress) {
          return false;
        }

        // Only keep pending transactions sent from the active EVM account
        return areAddressesEqual(fromAddress, activeEvmAddress);
      });

    return dedupeTransactions([
      ...pendingTransactions,
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
