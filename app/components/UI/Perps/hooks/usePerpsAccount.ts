import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { AccountState } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

const selectPerpsAccountState = createSelector(
  (state: RootState) =>
    state.engine.backgroundState.PerpsController?.accountState,
  (accountState): AccountState | null => {
    DevLogger.log('usePerpsAccount selector - accountState:', accountState);
    return accountState || null;
  },
);

/**
 * Hook to get persisted account state from Redux
 */
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
