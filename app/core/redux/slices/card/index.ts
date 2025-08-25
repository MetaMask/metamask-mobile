import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';

export interface CardSliceState {
  cardholderAccounts: string[];
  isLoaded: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  isLoaded: false,
};

// Async thunk for loading cardholder accounts
export const loadCardholderAccounts = createAsyncThunk(
  'card/loadCardholderAccounts',
  getCardholder,
);

const name = 'card';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    resetCardState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCardholderAccounts.fulfilled, (state, action) => {
        state.cardholderAccounts = action.payload ?? [];
        state.isLoaded = true;
      })
      .addCase(loadCardholderAccounts.rejected, (state, action) => {
        Logger.log(
          'cardSlice::Error loading cardholder accounts',
          action?.error?.message,
        );
        state.isLoaded = true;
      });
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectCardState = (state: RootState) => state[name];

// Derived selectors using createSelector
export const selectCardholderAccounts = createSelector(
  selectCardState,
  (card) => card.cardholderAccounts,
);

const selectedAccount = (rootState: RootState) =>
  selectSelectedInternalAccountByScope(rootState)('eip155:0');

export const selectIsCardholder = createSelector(
  selectCardholderAccounts,
  selectedAccount,
  (cardholderAccounts, selectedInternalAccountAddress) => {
    if (
      !selectedInternalAccountAddress ||
      !isEthAccount(selectedInternalAccountAddress)
    ) {
      return false;
    }

    return cardholderAccounts.includes(
      selectedInternalAccountAddress.address?.toLowerCase(),
    );
  },
);

// Actions
export const { resetCardState } = actions;
