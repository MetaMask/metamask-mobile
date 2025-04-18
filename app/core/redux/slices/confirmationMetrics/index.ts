import { merge } from 'lodash';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';

export interface ConfirmationMetrics {
  properties?: Record<string, unknown>;
  sensitiveProperties?: Record<string, unknown>;
}

export interface ConfirmationMetricsState {
  metricsById: Record<string, ConfirmationMetrics>;
}

export const initialState: ConfirmationMetricsState = {
  metricsById: {},
};

const name = 'confirmationMetrics';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    updateConfirmationMetric: (
      state,
      action: PayloadAction<{
        id: string;
        params: ConfirmationMetrics;
      }>,
    ) => {
      const { id, params } = action.payload;

      if (state.metricsById[id] === undefined) {
        state.metricsById[id] = {
          properties: {},
          sensitiveProperties: {},
        };
      }

      state.metricsById[id] = merge(state.metricsById[id], params);
    },
  },
});

const { actions, reducer } = slice;
export default reducer;
// Actions
export const { updateConfirmationMetric } = actions;

// Selectors
export const selectConfirmationMetrics = (state: RootState) =>
  state[name].metricsById;

export const selectConfirmationMetricsById = createSelector(
  [selectConfirmationMetrics, (_: RootState, id: string) => id],
  (metricsById, id) => metricsById[id]
);
