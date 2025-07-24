import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { PendingWithdrawal } from '../controllers/types';

/**
 * Memoized selector for pending withdrawals
 */
const selectPendingWithdrawals = createSelector(
  (state: RootState) =>
    state.engine.backgroundState.PerpsController?.pendingWithdrawals,
  (pendingWithdrawals): PendingWithdrawal[] => pendingWithdrawals || [],
);

/**
 * Hook to get pending withdrawals from Redux
 * Returns only withdrawals that are still pending
 */
export function usePerpsPendingWithdrawals(): PendingWithdrawal[] {
  const allWithdrawals = useSelector(selectPendingWithdrawals);

  // Filter to only show pending/processing withdrawals
  return allWithdrawals.filter(
    (withdrawal) =>
      withdrawal.status === 'pending' || withdrawal.status === 'processing',
  );
}

/**
 * Hook to check if there are any pending withdrawals
 */
export function useHasPendingWithdrawals(): boolean {
  const pendingWithdrawals = usePerpsPendingWithdrawals();
  return pendingWithdrawals.length > 0;
}
