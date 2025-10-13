import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import { CardTokenAllowance } from '../../../../components/UI/Card/types';

export interface CardSliceState {
  cardholderAccounts: string[];
  priorityTokensByAddress: Record<string, CardTokenAllowance | null>;
  lastFetchedByAddress: Record<string, Date | string | null>;
  authenticatedPriorityToken: CardTokenAllowance | null;
  authenticatedPriorityTokenLastFetched: Date | string | null;
  hasViewedCardButton: boolean;
  isLoaded: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
  authenticatedPriorityToken: null,
  authenticatedPriorityTokenLastFetched: null,
  hasViewedCardButton: false,
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
    setAuthenticatedPriorityToken: (
      state,
      action: PayloadAction<CardTokenAllowance | null>,
    ) => {
      state.authenticatedPriorityToken = action.payload;
    },
    setHasViewedCardButton: (state, action: PayloadAction<boolean>) => {
      state.hasViewedCardButton = action.payload;
    },
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
    setAuthenticatedPriorityTokenLastFetched: (
      state,
      action: PayloadAction<Date | string | null>,
    ) => {
      state.authenticatedPriorityTokenLastFetched = action.payload;
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

const selectedAccount = (rootState: RootState) =>
  selectSelectedInternalAccountByScope(rootState)('eip155:0');

export const selectCardPriorityToken = (
  authenticated: boolean,
  address?: string,
) =>
  createSelector(selectCardState, (card) =>
    authenticated
      ? card.authenticatedPriorityToken
      : address
      ? card.priorityTokensByAddress[address.toLowerCase()] || null
      : null,
  );

export const selectCardPriorityTokenLastFetched = (
  authenticated: boolean,
  address?: string,
) =>
  createSelector(selectCardState, (card) =>
    authenticated
      ? card.authenticatedPriorityTokenLastFetched
      : address
      ? card.lastFetchedByAddress[address.toLowerCase()] || null
      : null,
  );

export const selectIsCardCacheValid = (
  authenticated: boolean,
  address?: string,
) =>
  createSelector(
    selectCardPriorityTokenLastFetched(authenticated, address),
    (lastFetched) => {
      if (!lastFetched) return false;
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const lastFetchedDate =
        lastFetched instanceof Date ? lastFetched : new Date(lastFetched);

      if (authenticated) {
        return lastFetchedDate > thirtySecondsAgo;
      }

      return lastFetchedDate > fiveMinutesAgo;
    },
  );

export const selectIsCardholder = createSelector(
  selectCardholderAccounts,
  selectedAccount,
  (cardholderAccounts, selectedInternalAccount) => {
    if (!selectedInternalAccount || !isEthAccount(selectedInternalAccount)) {
      return false;
    }

    return cardholderAccounts.includes(
      selectedInternalAccount.address?.toLowerCase(),
    );
  },
);

export const selectHasViewedCardButton = createSelector(
  selectCardState,
  (card) => card.hasViewedCardButton,
);

// Actions
export const {
  resetCardState,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
  setAuthenticatedPriorityToken,
  setHasViewedCardButton,
  setAuthenticatedPriorityTokenLastFetched,
} = actions;
