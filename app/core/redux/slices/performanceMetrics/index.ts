// performanceSlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';

interface PerformanceState {
  nativeLaunchDuration: number | null;
  jsBundleDuration: number | null;
  appStartTime: number | null;
}

const initialState: PerformanceState = {
  nativeLaunchDuration: null,
  jsBundleDuration: null,
  appStartTime: null,
};

const slice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    setPerformanceMetrics: (state, action: PayloadAction<PerformanceState>) => {
      state.nativeLaunchDuration = action.payload.nativeLaunchDuration;
      state.jsBundleDuration = action.payload.jsBundleDuration;
      state.appStartTime = action.payload.appStartTime;
    },
  },
});

const { actions, reducer } = slice;

// Actions / action-creators
export const { setPerformanceMetrics } = actions;

// selectors
export const useNativeLaunchDuration = () => {
  return useSelector((state: RootState) => state.performanceMetrics.nativeLaunchDuration);
};

export const useJsBundleDuration = () => {
  return useSelector((state: RootState) => state.performanceMetrics.jsBundleDuration);
};

export const useAppStartTime = () => {
  return useSelector((state: RootState) => state.performanceMetrics.appStartTime);
};

// reducer
export default reducer;