import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  SocialLeaderboardState,
  OpenSortKey,
  ClosedSortKey,
} from './types';

export const initialState: SocialLeaderboardState = {
  positionSort: {
    open: 'value',
    closed: 'value',
  },
};

const socialLeaderboardSlice = createSlice({
  name: 'socialLeaderboard',
  initialState,
  reducers: {
    setPositionSort: (
      state,
      action: PayloadAction<
        | { tab: 'open'; sortKey: OpenSortKey }
        | { tab: 'closed'; sortKey: ClosedSortKey }
      >,
    ) => {
      state.positionSort[action.payload.tab] = action.payload.sortKey;
    },
  },
});

export const { setPositionSort } = socialLeaderboardSlice.actions;

export default socialLeaderboardSlice.reducer;
