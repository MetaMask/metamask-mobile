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

/**
 * The most recent card transactions for Card home's Recent activity panel,
 * newest first, capped at {@link CARD_RECENT_TRANSACTIONS_LIMIT}.
 */
export function useCardRecentTransactions(
  options: UseCardRecentTransactionsOptions = {},
): CardTransaction[] {
  const { items } = useCardTransactions({ enabled: options.enabled });
  return useMemo(() => items.slice(0, CARD_RECENT_TRANSACTIONS_LIMIT), [items]);
}
