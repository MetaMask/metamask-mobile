import { useMemo } from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  cardItem,
  onchainItem,
  type CardTransaction,
  type MoneyActivityItem,
} from '../types/moneyActivity';

export interface UseMoneyActivityItemsResult {
  items: MoneyActivityItem[];
  isLoading: boolean;
  error: boolean;
}

/**
 * Merge local on-chain Money transactions with Accounts-API card payments into
 * a single source-tagged, time-descending list.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  cardTransactions: CardTransaction[],
): MoneyActivityItem[] {
  const cardHashes = new Set(cardTransactions.map((c) => c.hash.toLowerCase()));
  const onchain = onchainTransactions
    .filter((tx) => !(tx.hash && cardHashes.has(tx.hash.toLowerCase())))
    .map(onchainItem);
  const card = cardTransactions.map(cardItem);
  return [...onchain, ...card].sort((a, b) => b.time - a.time);
}
