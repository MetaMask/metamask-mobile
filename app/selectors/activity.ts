import { TransactionMeta, TransactionType } from '@metamask/transaction-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import { areAddressesEqual } from '../util/address';
import { createDeepEqualSelector } from './util';
import { selectEvmAddress } from './accountsController';
import { selectPendingSmartTransactionsForSelectedAccountGroup } from './smartTransactionsController';
import {
  selectNonReplacedTransactions,
  selectRequiredTransactionIds,
} from './transactionController';

type LocalTransaction = TransactionMeta | SmartTransaction;

function dedupeTransactions(transactions: LocalTransaction[]) {
  const seenTransactions = new Set<string>();

  return transactions.filter((transaction) => {
    const { chainId, txParams } = transaction;
    const { from, nonce, actionId } = txParams || {};
    const hash = 'hash' in transaction ? transaction.hash : undefined;
    const isBridgeTransaction = transaction.type === TransactionType.bridge;
    const hasNonce = nonce !== undefined && nonce !== null;

    if (!from) {
      return false;
    }

    const dedupeKeyPrefix = `${chainId}-${String(from).toLowerCase()}`;
    const dedupeKey =
      isBridgeTransaction && hash
        ? `${dedupeKeyPrefix}-bridge-${hash.toLowerCase()}`
        : hasNonce
          ? `${dedupeKeyPrefix}-${nonce}`
          : `${dedupeKeyPrefix}-${actionId}`;

    if (seenTransactions.has(dedupeKey)) {
      return false;
    }

    seenTransactions.add(dedupeKey);
    return true;
  });
}

export const selectLocalTransactions = createDeepEqualSelector(
  [
    selectNonReplacedTransactions,
    selectPendingSmartTransactionsForSelectedAccountGroup,
    selectEvmAddress,
    selectRequiredTransactionIds,
  ],
  (
    nonReplacedTransactions,
    pendingSmartTransactions,
    activeEvmAddress,
    requiredTransactionIds,
  ) => {
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
