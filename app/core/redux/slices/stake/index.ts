import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface StakeState {
  amount?: string // stake amount
  currency?: string // stake currency
  txHash?: string // Transaction hash
  // account?: string; // Account wallet address
  // network?: string; // Network
  // chainId?: string; // Chain Id
}

export const initialState: StakeState = {
  amount: undefined,
  currency: undefined,
  txHash: undefined,
  // account: undefined,
  // network: undefined,
  // chainId: undefined,
};

const name = 'stakeAmount';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Updates the local stake amount state from the stake input screen.
     * @param state - The current state of the amount slice.
     * @param action - An action with the new staking amount as payload.
     */
    updateAmountState: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.amount = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

export const { updateAmountState } = actions;
