import { useMemo } from 'react';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useCardTransactions } from './useCardTransactions';

/** Number of transactions shown in Card home's Recent activity panel. */
export const CARD_RECENT_TRANSACTIONS_LIMIT = 5;

export interface UseCardRecentTransactionsOptions {
  /**
   * When false, the underlying list query stays idle. Card home sets this
   * only while the Activity segment is on screen.
   */
  enabled?: boolean;
}

export interface CardRecentTransactions {
  /** Newest first, capped at {@link CARD_RECENT_TRANSACTIONS_LIMIT}. */
  transactions: CardTransaction[];
  /** True while the first page has not arrived. */
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/**
 * The most recent card transactions for Card home's Recent activity panel,
 * newest first, capped at {@link CARD_RECENT_TRANSACTIONS_LIMIT}.
 * Loading and error stay distinct from an empty list so the panel does not
 * flash "No transactions yet" while the first fetch is in flight.
 */
export function useCardRecentTransactions(
  options: UseCardRecentTransactionsOptions = {},
): CardRecentTransactions {
  const { items, isLoading, error, refetch } = useCardTransactions({
    enabled: options.enabled,
  });
  const transactions = useMemo(
    () => items.slice(0, CARD_RECENT_TRANSACTIONS_LIMIT),
    [items],
  );
  return { transactions, isLoading, error, refetch };
}
