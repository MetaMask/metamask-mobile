import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Terminal analytics events represent one order reaching a terminal state
 * (completed/failed/cancelled). Keep a bounded persisted record so callback
 * re-fetches, app relaunches, and polling races cannot emit the same terminal
 * event repeatedly for the same order.
 */
export type TerminalOrderAnalyticsState = Record<string, number>;

/**
 * 90 days is long enough to cover delayed settlement and users reopening old
 * orders, while keeping the persisted key set bounded.
 */
export const TERMINAL_ORDER_ANALYTICS_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const initialState: TerminalOrderAnalyticsState = {};

const pruneExpiredEntries = (
  state: TerminalOrderAnalyticsState,
  now: number,
): void => {
  for (const key of Object.keys(state)) {
    if (now - state[key] > TERMINAL_ORDER_ANALYTICS_TTL_MS) {
      delete state[key];
    }
  }
};

const terminalOrderAnalyticsSlice = createSlice({
  name: 'terminalOrderAnalytics',
  initialState,
  reducers: {
    markTerminalOrderAnalyticsEmittedEntry: (
      state,
      action: PayloadAction<string>,
    ): void => {
      const now = Date.now();
      pruneExpiredEntries(state, now);
      state[action.payload] = now;
    },
    clearTerminalOrderAnalyticsEntries: (): TerminalOrderAnalyticsState => ({}),
  },
});

export const {
  markTerminalOrderAnalyticsEmittedEntry,
  clearTerminalOrderAnalyticsEntries,
} = terminalOrderAnalyticsSlice.actions;

export default terminalOrderAnalyticsSlice.reducer;
