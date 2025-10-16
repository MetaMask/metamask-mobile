import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';

const selectPredictControllerState = (state: RootState) =>
  state.engine.backgroundState.PredictController;

const selectPredictDepositTransaction = createSelector(
  selectPredictControllerState,
  (predictControllerState) =>
    predictControllerState?.depositTransaction || null,
);

const selectPredictClaimTransaction = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.claimTransaction || null,
);

const selectPredictClaimablePositions = createSelector(
  selectPredictControllerState,
  (predictControllerState) =>
    predictControllerState?.claimablePositions || null,
);

export {
  selectPredictControllerState,
  selectPredictDepositTransaction,
  selectPredictClaimTransaction,
  selectPredictClaimablePositions,
};
