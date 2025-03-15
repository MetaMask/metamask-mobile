/* eslint-disable @typescript-eslint/default-param-last */
import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';

export interface BannersState {
  dismissedBanners: string[];
}

const initialState: BannersState = {
  dismissedBanners: [],
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
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.banners) {
        return action.payload.banners;
      }
      return state;
    });
  },
});

export const { dismissBanner } = bannersSlice.actions;
export default bannersSlice.reducer;
