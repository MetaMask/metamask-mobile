import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

export const selectPredictSessionState = (state: RootState) =>
  state.engine?.backgroundState?.PredictSessionService;

export const selectPredictAccountReadiness = createSelector(
  selectPredictSessionState,
  (sessionState) => sessionState?.accountReadiness ?? null,
);

export const selectPredictCanSetup = createSelector(
  selectPredictAccountReadiness,
  (readiness) => readiness?.status === 'setup_required',
);

export const selectPredictCanTrade = createSelector(
  selectPredictAccountReadiness,
  (readiness) => readiness?.status === 'ready',
);
