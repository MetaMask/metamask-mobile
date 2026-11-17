import { useMemo } from 'react';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useCardTransactions } from './useCardTransactions';

/** Number of transactions shown in Card home's Recent activity panel. */
export const CARD_RECENT_TRANSACTIONS_LIMIT = 5;

/**
 * The most recent card transactions for Card home's Recent activity panel,
 * newest first, capped at {@link CARD_RECENT_TRANSACTIONS_LIMIT}.
 */
export function useCardRecentTransactions(): CardTransaction[] {
  const { items } = useCardTransactions();
  return useMemo(() => items.slice(0, CARD_RECENT_TRANSACTIONS_LIMIT), [items]);
}
