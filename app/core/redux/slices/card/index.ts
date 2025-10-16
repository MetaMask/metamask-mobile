import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import { CardTokenAllowance } from '../../../../components/UI/Card/types';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';

export interface CardSliceState {
  cardholderAccounts: string[];
  priorityTokensByAddress: Record<string, CardTokenAllowance | null>;
  lastFetchedByAddress: Record<string, Date | string | null>;
  hasViewedCardButton: boolean;
  isLoaded: boolean;
  alwaysShowCardButton: boolean;
  geoLocation: string;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
  hasViewedCardButton: false,
  isLoaded: false,
  alwaysShowCardButton: false,
  geoLocation: 'UNKNOWN',
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
    setAlwaysShowCardButton: (state, action: PayloadAction<boolean>) => {
      state.alwaysShowCardButton = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCardholderAccounts.fulfilled, (state, action) => {
        state.cardholderAccounts = action.payload.cardholderAddresses ?? [];
        state.geoLocation = action.payload.geoLocation ?? 'UNKNOWN';
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

export const selectAlwaysShowCardButton = createSelector(
  selectCardState,
  selectCardExperimentalSwitch,
  (card, cardExperimentalSwitchFlagEnabled) => {
    // Get the stored value of alwaysShowCardButton from the card state.
    // That's stored in a persistent storage.
    // If the feature flag is disabled, we return false.
    // Otherwise, we return the stored value.
    const alwaysShowCardButtonStoredValue = card.alwaysShowCardButton;

    return cardExperimentalSwitchFlagEnabled
      ? alwaysShowCardButtonStoredValue
      : false;
  },
);

export const selectCardGeoLocation = createSelector(
  selectCardState,
  (card) => card.geoLocation,
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

export const selectDisplayCardButton = createSelector(
  selectIsCardholder,
  selectAlwaysShowCardButton,
  selectCardGeoLocation,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
  (
    isCardholder,
    alwaysShowCardButton,
    geoLocation,
    cardSupportedCountries,
    displayCardButtonFeatureFlag,
  ) => {
    if (
      alwaysShowCardButton ||
      isCardholder ||
      ((cardSupportedCountries as Record<string, boolean>)?.[geoLocation] ===
        true &&
        displayCardButtonFeatureFlag)
    ) {
      return true;
    }

    return false;
  },
);

// Actions
export const {
  resetCardState,
  setAlwaysShowCardButton,
  setHasViewedCardButton,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} = actions;
