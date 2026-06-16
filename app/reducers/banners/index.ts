/* eslint-disable @typescript-eslint/default-param-last */
import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';

export interface BannersState {
  dismissedBanners: string[];
  /** The dismiss key of the last Braze banner the user explicitly closed. Persisted so the same banner is not re-shown on the next cold start. */
  lastDismissedBrazeBanner: string | null;
}

const initialState: BannersState = {
  dismissedBanners: [],
  lastDismissedBrazeBanner: null,
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    banners?: BannersState;
  };
}

const bannersSlice = createSlice({
  name: 'banners',
  initialState,
  reducers: {
    dismissBanner: (state, action: PayloadAction<string>) => {
      if (!state.dismissedBanners.includes(action.payload)) {
        state.dismissedBanners.push(action.payload);
      }
    },
    setLastDismissedBrazeBanner: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.lastDismissedBrazeBanner = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.banners) {
        return {
          ...initialState,
          ...action.payload.banners,
        };
      }
      return state;
    });
  },
});

export const { dismissBanner, setLastDismissedBrazeBanner } =
  bannersSlice.actions;
export default bannersSlice.reducer;
