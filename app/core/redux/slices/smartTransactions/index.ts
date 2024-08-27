import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface SmartTransactionsState {
  optInModalAppVersionSeen: string | null;
}

export const initialState: SmartTransactionsState = {
  optInModalAppVersionSeen: null,
};

const name = 'smartTransactions';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Updates the the app version seen for the opt in modal.
     * @param state - The current state of the smartTransactions slice.
     * @param action - An action with the new app version seen as payload.
     */
    updateOptInModalAppVersionSeen: (state, action: PayloadAction<string>) => {
      state.optInModalAppVersionSeen = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Actions / action-creators

export const { updateOptInModalAppVersionSeen } = actions;
