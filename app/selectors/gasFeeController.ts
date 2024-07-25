import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

export const selectGasFeeControllerState = (state: RootState) =>
  state.engine.backgroundState.GasFeeController;

const selectGasFeeControllerEstimatesStrict = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState) => gasFeeControllerState.gasFeeEstimates,
);

export const selectGasFeeControllerEstimates = createDeepEqualSelector(
  selectGasFeeControllerEstimatesStrict,
  (gasFeeEstimates) => gasFeeEstimates,
);

export const selectGasFeeControllerEstimateType = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState) => gasFeeControllerState.gasEstimateType,
);
