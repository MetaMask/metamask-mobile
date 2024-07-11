import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';

export const NUMBER_OF_REJECTIONS_THRESHOLD = 3;
export const REJECTION_THRESHOLD_IN_MS = 30000;
const BLOCKING_THRESHOLD_IN_MS = 60000;

export interface OriginState {
  rejections: number;
  lastRejection: number;
}

export interface OriginThrottlingState {
  origins: {
    [key: string]: OriginState;
  };
}

export const initialState: OriginThrottlingState = {
  origins: {},
};

const name = 'originThrottling';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    onRPCRequestRejectedByUser(
      state: OriginThrottlingState,
      action: PayloadAction<string>,
    ) {
      const origin = action.payload;
      const currentState = state.origins[origin] || {
        rejections: 0,
        lastRejection: 0,
      };
      const currentTime = Date.now();
      let newRejections = currentState.rejections;

      const isUnderThreshold =
        currentTime - currentState.lastRejection < REJECTION_THRESHOLD_IN_MS;

      newRejections = isUnderThreshold ? newRejections + 1 : 1;

      state.origins[origin] = {
        rejections: newRejections,
        lastRejection: currentTime,
      };
    },
    resetOriginSpamState: (
      state: OriginThrottlingState,
      action: PayloadAction<string>,
    ) => {
      const origin = action.payload;
      delete state.origins[origin];
    },
  },
});

// Actions
const { actions, reducer } = slice;

export default reducer;
export const { onRPCRequestRejectedByUser, resetOriginSpamState } = actions;

// Selectors
const selectOriginState = (state: RootState, origin: string) =>
  state[name].origins[origin];

export const selectDappBlockedForRPCRequests = (
  state: RootState,
  origin: string,
) => {
  const originState = selectOriginState(state, origin);
  if (!originState) {
    return false;
  }
  const currentTime = Date.now();
  const { rejections, lastRejection } = originState;
  const isWithinOneMinute =
    currentTime - lastRejection <= BLOCKING_THRESHOLD_IN_MS;

  return rejections >= NUMBER_OF_REJECTIONS_THRESHOLD && isWithinOneMinute;
};

export const selectOriginAtSpamThreshold = (
  state: RootState,
  origin: string,
) => {
  const originState = selectOriginState(state, origin);
  if (!originState) {
    return false;
  }
  const currentTime = Date.now();
  const isUnderThreshold =
    currentTime - originState.lastRejection < REJECTION_THRESHOLD_IN_MS;
  const hasReachedThreshold =
    originState.rejections >= NUMBER_OF_REJECTIONS_THRESHOLD &&
    isUnderThreshold;

  return hasReachedThreshold;
};
