import { useMemo } from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  cardItem,
  cashbackItem,
  onchainItem,
  type CardTransaction,
  type CashbackTransaction,
  type MoneyActivityItem,
} from '../types/moneyActivity';

export interface UseMoneyActivityItemsResult {
  items: MoneyActivityItem[];
  isLoading: boolean;
  error: boolean;
}

/**
 * Merge local on-chain Money transactions with Accounts-API card payments and
 * cashback rewards into a single source-tagged, time-descending list.
 *
 * The Accounts-API rows are authoritative for any hash they cover, so an
 * on-chain row sharing a hash with a card spend or cashback credit is dropped to
 * avoid double-rendering the settlement leg.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  cardTransactions: CardTransaction[],
  cashbackTransactions: CashbackTransaction[] = [],
): MoneyActivityItem[] {
  const apiHashes = new Set([
    ...cardTransactions.map((c) => c.hash.toLowerCase()),
    ...cashbackTransactions.map((c) => c.hash.toLowerCase()),
  ]);
  const onchain = onchainTransactions
    .filter((tx) => !(tx.hash && apiHashes.has(tx.hash.toLowerCase())))
    .map(onchainItem);
  const card = cardTransactions.map(cardItem);
  const cashback = cashbackTransactions.map(cashbackItem);
  return [...onchain, ...card, ...cashback].sort((a, b) => b.time - a.time);
}
