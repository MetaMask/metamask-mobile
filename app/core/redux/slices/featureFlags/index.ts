import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface FeatureFlagsState {
  featureFlags: object[] | null;
  loading: boolean;
  error: string | null;
}

export const initialState: FeatureFlagsState = {
  featureFlags: null,
  loading: false,
  error: null,
};

const name = 'featureFlags';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Initiates the fetching of feature flags.
     * @param state - The current state of the featureFlags slice.
     */
    getFeatureFlags: (state: FeatureFlagsState) => {
      state.loading = true;
      state.error = null;
    },
    /**
     * Handles the successful fetching of feature flags.
     * @param state - The current state of the featureFlags slice.
     * @param action - An action with the fetched feature flags as payload.
     */
    getFeatureFlagsSuccess: (
      state: FeatureFlagsState,
      action: PayloadAction<object>,
    ) => {
      state.featureFlags = action.payload;
      state.loading = false;
      state.error = null;
    },
    /**
     * Handles errors that occur during the fetching of feature flags.
     * @param state - The current state of the featureFlags slice.
     * @param action - An action with the error message as payload.
     */
    getFeatureFlagsError: (
      state: FeatureFlagsState,
      action: PayloadAction<string>,
    ) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const { getFeatureFlags, getFeatureFlagsSuccess, getFeatureFlagsError } =
  actions;

export const FETCH_FEATURE_FLAGS = 'getFeatureFlags';
export type FETCH_FEATURE_FLAGS = typeof FETCH_FEATURE_FLAGS;
