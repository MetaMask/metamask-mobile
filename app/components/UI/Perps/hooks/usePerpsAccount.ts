import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { AccountState } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Direct selector for Perps account state
 * No need for createSelector as we're not transforming the data
 */
const selectPerpsAccountState = (state: RootState): AccountState | null => {
  const accountState = state.engine.backgroundState.PerpsController?.accountState;
  DevLogger.log('usePerpsAccount selector - accountState:', accountState);
  return accountState || null;
};

/**
 * Hook to get persisted account state from Redux
 */
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
