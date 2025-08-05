import { CronjobControllerState } from '@metamask/snaps-controllers';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';

export interface CronjobControllerStorageState {
  cronjobControllerStorage?: CronjobControllerState;
}

export const initialState: CronjobControllerStorageState = {
  cronjobControllerStorage: undefined,
};

const name = 'cronjobControllerStorage';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    setCronjobControllerStorageState: (
      state,
      action: PayloadAction<CronjobControllerState>,
    ) => {
      // @ts-expect-error - Extensively deep merge.
      state.cronjobControllerStorage = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const selectCronjobControllerStorageState = (state: RootState) =>
  state[name];

export const { setCronjobControllerStorageState } = actions;
