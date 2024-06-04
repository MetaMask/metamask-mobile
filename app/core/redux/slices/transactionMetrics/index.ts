import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { merge } from 'lodash';

export interface TransactionMetricsState {
  propertiesByTransactionId: Record<string, any>;
}

export const initialState: TransactionMetricsState = {
  propertiesByTransactionId: {},
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
        params: any;
      }>,
    ) => {
      const { transactionId, params } = action.payload;

      if (state.propertiesByTransactionId[transactionId] === undefined) {
        state.propertiesByTransactionId[transactionId] = {};
      }

      state.propertiesByTransactionId[transactionId] = merge(
        state.propertiesByTransactionId[transactionId],
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
export const selectTransactionSimulationMetrics = (state: RootState) =>
  state[name].propertiesByTransactionId;
