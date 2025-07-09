import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type {
  DepositStatus,
  DepositFlowType,
  DepositStepInfo,
} from '../controllers/types';

/**
 * Default deposit steps for when no steps are available
 */
const defaultDepositSteps: DepositStepInfo = {
  totalSteps: 0,
  currentStep: 0,
  stepNames: [],
  stepTxHashes: [],
};

const selectPerpsDepositState = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController,
  (perpsState) => {
    if (!perpsState) {
      return {
        status: 'idle' as DepositStatus,
        flowType: null as DepositFlowType | null,
        currentTxHash: null as string | null,
        error: null as string | null,
        requiresModalDismissal: false,
        steps: defaultDepositSteps,
      };
    }

    return {
      status: perpsState.depositStatus || 'idle',
      flowType: perpsState.depositFlowType || null,
      currentTxHash: perpsState.currentDepositTxHash || null,
      error: perpsState.depositError || null,
      requiresModalDismissal: perpsState.requiresModalDismissal || false,
      steps: perpsState.depositSteps || defaultDepositSteps,
    };
  }
);

/**
 * Consolidated hook for deposit state
 */
export function usePerpsDeposit() {
  return useSelector(selectPerpsDepositState);
}
