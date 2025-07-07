import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type {
  DepositStatus,
  DepositFlowType,
  DepositStepInfo,
} from '../controllers/types';

/**
 * Consolidated hook for deposit state
 * Returns all deposit-related state in a single object to minimize re-renders
 * Reusable pattern for withdrawal and other operation flows
 */
export function usePerpsDepositState() {
  const perpsState = useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController
  );

  return useMemo(() => {
    if (!perpsState) {
      return {
        status: 'idle' as DepositStatus,
        flowType: null as DepositFlowType | null,
        currentTxHash: null as string | null,
        error: null as string | null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 0,
          currentStep: 0,
          stepNames: [],
          stepTxHashes: [],
        } as DepositStepInfo,
      };
    }

    return {
      status: perpsState.depositStatus || 'idle',
      flowType: perpsState.depositFlowType || null,
      currentTxHash: perpsState.currentDepositTxHash || null,
      error: perpsState.depositError || null,
      requiresModalDismissal: perpsState.requiresModalDismissal || false,
      steps: perpsState.depositSteps || {
        totalSteps: 0,
        currentStep: 0,
        stepNames: [],
        stepTxHashes: [],
      },
    };
  }, [perpsState]);
}
