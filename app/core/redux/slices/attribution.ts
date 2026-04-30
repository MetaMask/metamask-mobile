import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Persisted acquisition fields. Aligns with Segment / deep-link-used naming.
 */
export interface AttributionRecord {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  attribution_id?: string;
  capturedAt: number;
}

export interface AttributionState {
  attribution: AttributionRecord | null;
}

/** Default TTL for attribution records. */
export const ATTRIBUTION_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const initialState: AttributionState = {
  attribution: null,
};

/**
 * Fields accepted by {@link saveAttribution} (no timestamp — set at save time).
 */
export type SaveAttributionPayload = Omit<AttributionRecord, 'capturedAt'>;

const attributionSlice = createSlice({
  name: 'attribution',
  initialState,
  reducers: {
    saveAttribution: (
      state,
      action: PayloadAction<SaveAttributionPayload>,
    ): void => {
      const p = action.payload;
      const hasAny =
        (p.attribution_id?.trim() ?? '') !== '' ||
        (p.utm_source?.trim() ?? '') !== '' ||
        (p.utm_medium?.trim() ?? '') !== '' ||
        (p.utm_campaign?.trim() ?? '') !== '' ||
        (p.utm_term?.trim() ?? '') !== '' ||
        (p.utm_content?.trim() ?? '') !== '';
      if (!hasAny) {
        return;
      }
      state.attribution = {
        ...p,
        capturedAt: Date.now(),
      };
    },
    clearAttribution: (state): void => {
      state.attribution = null;
    },
    /** Drop attribution older than {@link ATTRIBUTION_DEFAULT_TTL_MS} (e.g. after rehydrate). */
    expireAttributionIfStale: (state): void => {
      const a = state.attribution;
      if (
        a !== null &&
        Date.now() - a.capturedAt > ATTRIBUTION_DEFAULT_TTL_MS
      ) {
        state.attribution = null;
      }
    },
  },
});

export const { saveAttribution, clearAttribution, expireAttributionIfStale } =
  attributionSlice.actions;

export default attributionSlice.reducer;
