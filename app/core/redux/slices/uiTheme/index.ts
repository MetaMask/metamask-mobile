import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export const NETWORK_ID_LOADING = 'loading';

export interface uiThemeState {
  wallet: string;
}

export const initialState: uiThemeState = {
  wallet: 'default',
};

const name = 'uiTheme';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Updates the wallet ui.
     * @param state - The current state of the uiTheme slice.
     * @param action - An action with the new wallet vire.
     */
    walletUIUpdated: (state, action: PayloadAction<string>) => {
      state.wallet = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Actions / action-creators

export const { walletUIUpdated } = actions;
