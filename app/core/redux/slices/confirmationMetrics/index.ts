import { merge } from 'lodash';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { TransactionBridgeQuote } from '../../../../components/Views/confirmations/utils/bridge';

export interface ConfirmationMetrics {
  properties?: Record<string, unknown>;
  sensitiveProperties?: Record<string, unknown>;
}

export interface TransactionPayToken {
  address: Hex;
  chainId: Hex;
}

export interface ConfirmationMetricsState {
  metricsById: Record<string, ConfirmationMetrics>;
  transactionPayTokenById: Record<string, TransactionPayToken>;
  transactionBridgeQuotesById: Record<
    string,
    TransactionBridgeQuote[] | undefined
  >;
  isTransactionBridgeQuotesLoadingById: Record<string, boolean>;
}

export const initialState: ConfirmationMetricsState = {
  metricsById: {},
  transactionPayTokenById: {},
  transactionBridgeQuotesById: {},
  isTransactionBridgeQuotesLoadingById: {},
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

    setTransactionPayToken: (
      state,
      action: PayloadAction<{
        transactionId: string;
        payToken: TransactionPayToken;
      }>,
    ) => {
      const { transactionId, payToken } = action.payload;
      state.transactionPayTokenById[transactionId] = payToken;
    },

    setTransactionBridgeQuotes: (
      state,
      action: PayloadAction<{
        transactionId: string;
        quotes: TransactionBridgeQuote[] | undefined;
      }>,
    ) => {
      const { transactionId, quotes } = action.payload;
      state.transactionBridgeQuotesById[transactionId] = quotes;
    },

    setTransactionBridgeQuotesLoading: (
      state,
      action: PayloadAction<{
        transactionId: string;
        isLoading: boolean;
      }>,
    ) => {
      const { transactionId, isLoading } = action.payload;
      state.isTransactionBridgeQuotesLoadingById[transactionId] = isLoading;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Actions
export const {
  updateConfirmationMetric,
  setTransactionPayToken,
  setTransactionBridgeQuotes,
  setTransactionBridgeQuotesLoading,
} = actions;

// Selectors
export const selectConfirmationMetrics = (state: RootState) =>
  state[name].metricsById;

export const selectTransactionPayToken = (state: RootState, id: string) =>
  state[name].transactionPayTokenById[id];

export const selectConfirmationMetricsById = createSelector(
  [selectConfirmationMetrics, (_: RootState, id: string) => id],
  (metricsById, id) => metricsById[id],
);

export const selectTransactionBridgeQuotesById = createSelector(
  (state: RootState) => state[name].transactionBridgeQuotesById,
  (_: RootState, transactionId: string) => transactionId,
  (transactionBridgeQuotesById, transactionId) =>
    transactionBridgeQuotesById[transactionId],
);

export const selectIsTransactionBridgeQuotesLoadingById = createSelector(
  (state: RootState) => state[name].isTransactionBridgeQuotesLoadingById,
  (_: RootState, transactionId: string) => transactionId,
  (isTransactionBridgeQuotesLoadingById, transactionId) =>
    isTransactionBridgeQuotesLoadingById[transactionId] ?? false,
);
