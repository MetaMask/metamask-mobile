import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export const REFECHING_ACCOUNTS_STATES = 'loading';

export interface NotificationsAccountsState {
  [address: string]: boolean;
}

export const initialState: NotificationsAccountsState = {};

const name = 'notificationsAccountsProvider';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Updates the local accounts state based on external notifications source.
     * @param state - The current state of the notificationsAccountsProvider slice.
     * @param action - An action with the new accounts states as payload.
     */

    updateAccountState: (
      state,
      action: PayloadAction<NotificationsAccountsState>,
    ) => {
      if (JSON.stringify(state) !== JSON.stringify(action.payload)) {
        return action.payload;
      }
      return state;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const { updateAccountState } = actions;
