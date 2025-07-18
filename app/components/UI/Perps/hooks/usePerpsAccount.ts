import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { AccountState } from '../controllers/types';

/**
 * Memoized selector for Perps account state
 * Uses createSelector for consistency and performance
 */
const selectPerpsAccountState = createSelector(
  (state: RootState) =>
    state.engine.backgroundState.PerpsController?.accountState,
  (accountState): AccountState | null => accountState || null,
);

/**
 * Hook to get persisted account state from Redux
 * Returns null if no account state exists
 */
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
