import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../../reducers';

export interface SampleCounterState {
  count: number;
}

const initialState: SampleCounterState = {
  count: 0,
};

const name = 'sampleCounter';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

const { actions, reducer } = slice;

// Actions
export const { increment, decrement, setCount } = actions;

// Selectors
export const selectCount = (state: RootState) => state[name].count;

export default reducer; 