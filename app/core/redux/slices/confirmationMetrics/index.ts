import { merge } from 'lodash';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';

export interface ConfirmationMetrics {
  properties?: Record<string, unknown>;
  sensitiveProperties?: Record<string, unknown>;
}

export interface PayAsset {
  address: Hex;
  chainId: Hex;
}

export interface ConfirmationMetricsState {
  metricsById: Record<string, ConfirmationMetrics>;
  payAssetById: Record<string, PayAsset>;
}

export const initialState: ConfirmationMetricsState = {
  metricsById: {},
  payAssetById: {},
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

    setPayAsset: (
      state,
      action: PayloadAction<{ id: string; payAsset: PayAsset }>,
    ) => {
      const { id, payAsset } = action.payload;
      state.payAssetById[id] = payAsset;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Actions
export const { updateConfirmationMetric, setPayAsset } = actions;

// Selectors
export const selectConfirmationMetrics = (state: RootState) =>
  state[name].metricsById;

export const selectPayAsset = (state: RootState, id: string) =>
  state[name].payAssetById[id];

export const selectConfirmationMetricsById = createSelector(
  [selectConfirmationMetrics, (_: RootState, id: string) => id],
  (metricsById, id) => metricsById[id],
);
