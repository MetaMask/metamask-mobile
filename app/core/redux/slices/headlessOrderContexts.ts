import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RampSurface } from '../../../components/UI/Ramp/types/depositAnalytics';

/**
 * Context carried from a headless order's creation to its terminal event so
 * `RAMPS_TRANSACTION_FAILED` can be tagged `ramp_type: HEADLESS` (which
 * `ramp_surface`, which `region`). See `headlessOrderContextRegistry.ts`.
 */
export interface HeadlessOrderContextEntry {
  rampSurface?: RampSurface;
  region: string;
  createdAt: number;
}

/** Keyed by `extractOrderCode(providerOrderId)`. */
export type HeadlessOrderContextsState = Record<
  string,
  HeadlessOrderContextEntry
>;

/**
 * 30 days — comfortably above the longest bank-transfer settlement window.
 * NOT the headless session registry's 1h `STALE_SESSION_TTL_MS`: that would
 * evict the context before a multi-day terminal event arrives and reintroduce
 * the mis-tag bug this slice exists to fix.
 */
export const HEADLESS_ORDER_CONTEXT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const initialState: HeadlessOrderContextsState = {};

/** Payload for {@link setHeadlessOrderContextEntry} (timestamp set at save time). */
export interface SetHeadlessOrderContextPayload {
  key: string;
  context: { rampSurface?: RampSurface; region: string };
}

const headlessOrderContextsSlice = createSlice({
  name: 'headlessOrderContexts',
  initialState,
  reducers: {
    setHeadlessOrderContextEntry: (
      state,
      action: PayloadAction<SetHeadlessOrderContextPayload>,
    ): void => {
      const now = Date.now();
      // GC-on-write: drop stale entries left behind by orders that never reach
      // a terminal status (stuck-Pending, or removed without a terminal event).
      for (const key of Object.keys(state)) {
        if (now - state[key].createdAt > HEADLESS_ORDER_CONTEXT_TTL_MS) {
          delete state[key];
        }
      }
      state[action.payload.key] = {
        ...action.payload.context,
        createdAt: now,
      };
    },
    removeHeadlessOrderContextEntry: (
      state,
      action: PayloadAction<string>,
    ): void => {
      delete state[action.payload];
    },
    clearHeadlessOrderContexts: (): HeadlessOrderContextsState => ({}),
  },
});

export const {
  setHeadlessOrderContextEntry,
  removeHeadlessOrderContextEntry,
  clearHeadlessOrderContexts,
} = headlessOrderContextsSlice.actions;

export default headlessOrderContextsSlice.reducer;
