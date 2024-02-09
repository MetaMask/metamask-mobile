import { createSelector } from 'reselect';
import { RootState } from '../reducers';

const selectGasFeeControllerState = (state: RootState) =>
  state.engine.backgroundState.GasFeeController;

export const selectGasFeeControllerEstimates = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState) => gasFeeControllerState.gasFeeEstimates,
);

export const selectGasFeeControllerEstimateType = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState) => gasFeeControllerState.gasEstimateType,
);
