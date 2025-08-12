import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { AccountState } from '../controllers/types';

/**
 * Direct selector for Perps account state
 * No need for createSelector as we're not transforming the data
 */
const selectPerpsAccountState = (state: RootState): AccountState | null =>
  state.engine.backgroundState.PerpsController?.accountState || null;

/**
 * Hook to get persisted account state from Redux
 * Returns null if no account state exists
 */
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
