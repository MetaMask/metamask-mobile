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
 *
 * Double-count guard (MUSD-817 open question #4): a card settlement transfer is
 * never composed on this device, so it can't appear in the local
 * `TransactionController` — but we assert it at the boundary anyway by dropping
 * any on-chain row whose hash matches a card payment's hash. Belt and braces.
 *
 * Kept as a pure merge over already-fetched inputs so it's trivially testable;
 * the wiring hook below supplies the two sources.
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

/**
 * Composes the local-only Money transactions with card payments. Accepts the
 * two sources as arguments so the consumer owns the source hooks (and tests can
 * drive this directly). Loading/error reflect the card source only — the local
 * source is synchronous selector state.
 */
export function useMoneyActivityItems(args: {
  onchainTransactions: TransactionMeta[];
  cardTransactions: CardTransaction[];
  isCardLoading: boolean;
  cardError: boolean;
}): UseMoneyActivityItemsResult {
  const { onchainTransactions, cardTransactions, isCardLoading, cardError } =
    args;

  const items = useMemo(
    () => mergeMoneyActivity(onchainTransactions, cardTransactions),
    [onchainTransactions, cardTransactions],
  );

  return { items, isLoading: isCardLoading, error: cardError };
}
