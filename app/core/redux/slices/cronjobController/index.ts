import { CronjobControllerState } from '@metamask/snaps-controllers';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';

export interface CronjobControllerStorageState {
  storage?: CronjobControllerState;
}

export const initialState: CronjobControllerStorageState = {
  storage: undefined,
};

const name = 'cronjobController';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    setCronjobControllerState: (
      state,
      action: PayloadAction<CronjobControllerState>,
    ) => {
      // @ts-expect-error - Extensively deep merge.
      state.storage = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const selectCronjobControllerState = (state: RootState) => state[name];

export const { setCronjobControllerState } = actions;
