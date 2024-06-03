import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { merge } from 'lodash';

export interface TransactionMetricsState {
  simulationPropertiesByTransactionId: Record<string, any>;
}

export const initialState: TransactionMetricsState = {
  simulationPropertiesByTransactionId: {},
};

const name = 'transactionMetrics';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    updateTransactionSimulationMetric: (
      state,
      action: PayloadAction<{
        transactionId: string;
        params: any;
      }>,
    ) => {
      const { transactionId, params } = action.payload;

      if (
        state.simulationPropertiesByTransactionId[transactionId] === undefined
      ) {
        state.simulationPropertiesByTransactionId[transactionId] = {};
      }

      state.simulationPropertiesByTransactionId[transactionId] = merge(
        state.simulationPropertiesByTransactionId[transactionId],
        params,
      );
    },
  },
});

const { actions, reducer } = slice;
export default reducer;
// Actions
export const { updateTransactionSimulationMetric } = actions;

// Selectors
export const selectTransactionSimulationMetrics = (state: RootState) =>
  state[name].simulationPropertiesByTransactionId;
