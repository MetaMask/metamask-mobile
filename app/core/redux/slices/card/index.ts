import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';
import { CardTokenAllowance } from '../../../../components/UI/Card/types';

export interface CardSliceState {
  cardholderAccounts: string[];
  priorityTokensByAddress: Record<string, CardTokenAllowance | null>;
  lastFetchedByAddress: Record<string, Date | string | null>;
  isLoaded: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
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
      action: PayloadAction<{
        address: string;
        token: CardTokenAllowance | null;
      }>,
    ) => {
      state.priorityTokensByAddress[action.payload.address.toLowerCase()] =
        action.payload.token;
    },
    setCardPriorityTokenLastFetched: (
      state,
      action: PayloadAction<{
        address: string;
        lastFetched: Date | string | null;
      }>,
    ) => {
      state.lastFetchedByAddress[action.payload.address.toLowerCase()] =
        action.payload.lastFetched;
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

export const selectCardPriorityToken = (address?: string) =>
  createSelector(selectCardState, (card) =>
    address
      ? card.priorityTokensByAddress[address.toLowerCase()] || null
      : null,
  );

export const selectCardPriorityTokenLastFetched = (address?: string) =>
  createSelector(selectCardState, (card) =>
    address ? card.lastFetchedByAddress[address.toLowerCase()] || null : null,
  );

export const selectIsCardCacheValid = (address?: string) =>
  createSelector(selectCardPriorityTokenLastFetched(address), (lastFetched) => {
    if (!lastFetched) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // Handle both Date objects and ISO date strings (from redux-persist)
    const lastFetchedDate =
      lastFetched instanceof Date ? lastFetched : new Date(lastFetched);
    return lastFetchedDate > fiveMinutesAgo;
  });

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
