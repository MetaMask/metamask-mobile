import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { merge } from 'lodash';

interface TransactionMetrics {
  properties: Record<string, any>;
  sensitiveProperties: Record<string, any>;
}

export interface TransactionMetricsState {
  metricsByTransactionId: Record<string, TransactionMetrics>;
}

export const initialState: TransactionMetricsState = {
  metricsByTransactionId: {},
};

const name = 'transactionMetrics';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    updateTransactionMetrics: (
      state,
      action: PayloadAction<{
        transactionId: string;
        params: TransactionMetrics;
      }>,
    ) => {
      const { transactionId, params } = action.payload;

      if (state.metricsByTransactionId[transactionId] === undefined) {
        state.metricsByTransactionId[transactionId] = {
          properties: {},
          sensitiveProperties: {},
        };
      }

      state.metricsByTransactionId[transactionId] = merge(
        state.metricsByTransactionId[transactionId],
        params,
      );
    },
  },
});

const { actions, reducer } = slice;
export default reducer;
// Actions
export const { updateTransactionMetrics } = actions;

// Selectors
export const selectTransactionMetrics = (state: RootState) =>
  state[name].metricsByTransactionId;
