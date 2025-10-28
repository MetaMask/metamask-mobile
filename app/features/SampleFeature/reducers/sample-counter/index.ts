import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';

/**
 * Interface representing the state shape for the sample counter feature
 *
 * @interface SampleCounterState
 * @property {number} count - The current count value
 *
 * @sampleFeature do not use in production code
 */
export interface SampleCounterState {
  count: number;
}

/**
 * Initial state for the sample counter slice
 *
 * @constant
 */
const initialState: SampleCounterState = {
  count: 0,
};

/**
 * Name of the slice in the Redux store
 *
 * @constant
 */
const name = 'sampleCounter';

/**
 * Redux slice for the sample counter feature
 *
 * @remarks
 * This slice demonstrates basic Redux state management patterns:
 * - State shape definition
 * - Action creators
 * - Reducers
 * - Selectors
 *
 * @sampleFeature do not use in production code
 */
const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Increments the counter by 1
     *
     * @param state - The current state
     */
    increment: (state) => {
      state.count += 1;
    },
    /**
     * Sets the counter to a specific value
     *
     * @param state - The current state
     * @param action - The action containing the new count value
     */
    setCount: (state, action: { payload: number }) => {
      state.count = action.payload;
    },
  },
});

const { actions, reducer } = slice;

/**
 * Action creators for the sample counter slice
 *
 * @sampleFeature do not use in production code
 */
export const { increment, setCount } = actions;

/**
 * Selector to get the current count from the Redux store
 *
 * @param state - The root state of the Redux store
 * @returns The current count value
 *
 * @sampleFeature do not use in production code
 */
export const selectCount = (state: RootState) => state[name].count;

export { initialState };

export default reducer;
