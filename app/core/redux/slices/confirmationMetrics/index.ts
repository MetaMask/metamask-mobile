import { isEqual } from 'lodash';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';
import { selectTransactionPayQuotesByTransactionId } from '../../../../selectors/transactionPayController';

export interface ConfirmationMetrics {
  properties?: Record<string, unknown>;
  sensitiveProperties?: Record<string, unknown>;
}
export interface ConfirmationMetricsState {
  metricsById: Record<string, ConfirmationMetrics>;

  /** @deprecated */
  transactionBridgeQuotesById: Record<string, unknown>;

  /** @deprecated */
  transactionPayTokenById: Record<string, unknown>;

  /** @deprecated */
  isTransactionBridgeQuotesLoadingById: Record<string, boolean>;

  /** @deprecated */
  isTransactionUpdating: Record<string, boolean>;
}

export const initialState: ConfirmationMetricsState = {
  metricsById: {},
} as ConfirmationMetricsState;

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

      const metrics = state.metricsById[id];

      // Overwrite each top-level key instead of deep merging. lodash `merge`
      // combined arrays by index, so a shrinking list kept stale entries
      // (`['a', 'b']` + `['b']` gave `['b', 'b']`) and an empty array was
      // ignored entirely, which corrupted `alert_trigger_name` and
      // `alert_resolved`.
      //
      // Keys are only assigned when the value actually differs. Immer then
      // returns the previous state object for an identical update, so
      // subscribers of this slice do not re-render on no-op writes. A plain
      // object spread would create new references on every dispatch.
      for (const bag of ['properties', 'sensitiveProperties'] as const) {
        const updates = params[bag];

        if (!updates) {
          continue;
        }

        const target = (metrics[bag] ??= {});

        for (const [key, value] of Object.entries(updates)) {
          if (!isEqual(target[key], value)) {
            target[key] = value;
          }
        }
      }
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
  (metricsById, id) => metricsById[id],
);

/**
 * @deprecated Use `useTransactionPayQuotes` instead
 */
export const selectTransactionBridgeQuotesById =
  selectTransactionPayQuotesByTransactionId;
