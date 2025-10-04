import { useCallback } from 'react';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';

const selectPredictEligibility = createSelector(
  (state: RootState) => state.engine.backgroundState.PredictController,
  (predictState) => predictState.eligibility,
);

export type PredictEligibilityState = ReturnType<
  typeof selectPredictEligibility
>;

/**
 * Hook to access Predict eligibility state and trigger refreshes via the controller.
 */
export const usePredictEligibility = ({
  providerId,
}: {
  providerId: string;
}) => {
  const eligibility = useSelector(selectPredictEligibility);

  const refreshEligibility = useCallback(async () => {
    const controller = Engine.context.PredictController;
    await controller.refreshEligibility();
  }, []);

  return {
    isEligible: eligibility[providerId],
    refreshEligibility,
  };
};
