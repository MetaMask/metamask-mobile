import { CronjobControllerState } from '@metamask/snaps-controllers';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';

// Opaque alias: shields the slice from snaps' deeply recursive `Json` type
// so reduxjs-toolkit's `WritableDraft` mapper doesn't trigger
// "Type instantiation is excessively deep" (TS2589). Runtime type is
// unchanged — only the static view at this boundary is widened.
type OpaqueCronjobControllerState = Record<string, unknown>;

export interface CronjobControllerStorageState {
  storage?: OpaqueCronjobControllerState;
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
      state.storage = action.payload as OpaqueCronjobControllerState;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const selectCronjobControllerState = (state: RootState) => state[name];

export const selectCronjobControllerStorage = createSelector(
  [selectCronjobControllerState],
  ({ storage }) => storage,
);

export const { setCronjobControllerState } = actions;
