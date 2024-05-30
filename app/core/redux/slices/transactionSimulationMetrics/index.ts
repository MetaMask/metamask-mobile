import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { merge } from 'lodash';

export interface TransactionSimulationsMetricsState {
  simulations: Record<string, any>;
}

export const initialState: TransactionSimulationsMetricsState = {
  simulations: {},
};

const name = 'transactionSimulationMetrics';

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

      if (state.simulations[transactionId] === undefined) {
        state.simulations[transactionId] = {};
      }

      state.simulations[transactionId] = merge(
        state.simulations[transactionId],
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
export const selectTransactionSimulationMetrics =
  (state: RootState) => (transactionId: string) =>
    state[name].simulations[transactionId];
