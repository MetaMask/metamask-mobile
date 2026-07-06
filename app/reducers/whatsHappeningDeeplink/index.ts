import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '..';

/**
 * State for the What's Happening deep link.
 *
 * Holds the id of a market overview "front page" item that a
 * `whats-happening?id=<uuid>` deep link asked us to surface. The What's
 * Happening carousel renders this item — fetched from the front-page endpoint —
 * as its first card with an "Outdated" label. `null` when there is none.
 */
export interface WhatsHappeningDeeplinkState {
  outdatedItemId: string | null;
}

export const initialState: WhatsHappeningDeeplinkState = {
  outdatedItemId: null,
};

const whatsHappeningDeeplinkSlice = createSlice({
  name: 'whatsHappeningDeeplink',
  initialState,
  reducers: {
    setWhatsHappeningOutdatedItemId: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.outdatedItemId = action.payload;
    },
    clearWhatsHappeningOutdatedItemId: (state) => {
      state.outdatedItemId = null;
    },
  },
});

export const {
  setWhatsHappeningOutdatedItemId,
  clearWhatsHappeningOutdatedItemId,
} = whatsHappeningDeeplinkSlice.actions;

/**
 * Selects the id of the deep-linked "outdated" front-page item to surface in
 * the What's Happening carousel, or `null` when there is none.
 *
 * @param state - The Redux root state.
 * @returns The outdated front-page item id, or `null`.
 */
export const selectWhatsHappeningOutdatedItemId = (
  state: RootState,
): string | null => state.whatsHappeningDeeplink.outdatedItemId;

export default whatsHappeningDeeplinkSlice.reducer;
