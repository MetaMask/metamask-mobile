import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';
import { CardTokenAllowance } from '../../../../components/UI/Card/types';

export interface CardSliceState {
  cardholderAccounts: string[];
  priorityToken: CardTokenAllowance | null;
  lastFetched: Date | string | null;
  isLoaded: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  priorityToken: null,
  lastFetched: null,
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
    setCardPriorityToken: (
      state,
      action: PayloadAction<CardTokenAllowance | null>,
    ) => {
      state.priorityToken = action.payload;
    },
    setCardPriorityTokenLastFetched: (
      state,
      action: PayloadAction<Date | string | null>,
    ) => {
      state.lastFetched = action.payload;
    },
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

export const selectCardPriorityToken = (state: RootState) =>
  selectCardState(state).priorityToken;

export const selectCardPriorityTokenLastFetched = (state: RootState) =>
  selectCardState(state).lastFetched;

export const selectIsCardCacheValid = createSelector(
  selectCardPriorityTokenLastFetched,
  (lastFetched) => {
    if (!lastFetched) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // Handle both Date objects and ISO date strings (from redux-persist)
    const lastFetchedDate =
      lastFetched instanceof Date ? lastFetched : new Date(lastFetched);
    return lastFetchedDate > fiveMinutesAgo;
  },
);

const selectSelectedInternalAccount = (state: RootState) =>
  selectSelectedInternalAccountFormattedAddress(state);

export const selectIsCardholder = createSelector(
  selectCardholderAccounts,
  selectSelectedInternalAccount,
  (cardholderAccounts, selectedInternalAccountAddress) => {
    if (!selectedInternalAccountAddress) {
      return false;
    }
    return cardholderAccounts.includes(selectedInternalAccountAddress);
  },
);

// Actions
export const {
  resetCardState,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} = actions;
