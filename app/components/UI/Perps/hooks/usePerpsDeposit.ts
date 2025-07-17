import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { DepositStatus } from '../controllers/types';

const selectPerpsDepositState = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController,
  (perpsState) => {
    if (!perpsState) {
      return {
        status: 'idle' as DepositStatus,
        currentTxHash: null as string | null,
        error: null as string | null,
      };
    }

    return {
      status: perpsState.depositStatus || 'idle',
      currentTxHash: perpsState.currentDepositTxHash || null,
      error: perpsState.depositError || null,
    };
  },
);

/**
 * Consolidated hook for deposit state
 */
export function usePerpsDeposit() {
  return useSelector(selectPerpsDepositState);
}
