/* eslint-disable @typescript-eslint/default-param-last */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

export interface BannersState {
  dismissedBanners: string[];
}

const initialState: BannersState = {
  dismissedBanners: [],
};

interface RehydrateAction {
  type: typeof REHYDRATE;
  key: string;
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
    builder.addCase(REHYDRATE, (state, action: RehydrateAction) => {
      if (action.payload?.banners) {
        return action.payload.banners;
      }
      return state;
    });
  },
});

export const { dismissBanner } = bannersSlice.actions;
export default bannersSlice.reducer;
