import { createSelector } from 'reselect';
import { GasFeeState } from '@metamask/gas-fee-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectGasFeeControllerState = (state: RootState) =>
  state.engine.backgroundState.GasFeeController;

const selectGasFeeControllerEstimatesStrict = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState: GasFeeState) => gasFeeControllerState.gasFeeEstimates,
);

export const selectGasFeeControllerEstimates = createDeepEqualSelector(
  selectGasFeeControllerEstimatesStrict,
  (gasFeeEstimates: Record<string, never>) => gasFeeEstimates,
);

export const selectGasFeeControllerEstimateType = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState: GasFeeState) => gasFeeControllerState.gasEstimateType,
);
