import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EngineState } from '../../../../core/Engine';

export interface updateEngineAction {
  key: string;
  engineState: EngineState;
}

const initialState = {
  backgroundState: {} as any,
};

const engineSlice = createSlice({
  name: 'engine',
  initialState,
  reducers: {
    initializeEngineState: (state, action: PayloadAction<EngineState>) => {
      state.backgroundState = action.payload;
    },
    updateEngineState: (state, action: PayloadAction<updateEngineAction>) => {
      state.backgroundState[action.payload.key] =
        action.payload.engineState[action.payload.key as keyof EngineState];
    },
  },
});

export const actions = engineSlice.actions;
export const reducer = engineSlice.reducer;
