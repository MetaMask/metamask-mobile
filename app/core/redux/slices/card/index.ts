import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import {
  CardLocation,
  CardTokenAllowance,
} from '../../../../components/UI/Card/types';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { handleLocalAuthentication } from '../../../../components/UI/Card/util/handleLocalAuthentication';
import { Region } from '../../../../components/UI/Card/components/Onboarding/RegionSelectorModal';

export interface OnboardingState {
  onboardingId: string | null;
  selectedCountry: Region | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
}

export interface CacheState {
  data: Record<string, unknown>;
  timestamps: Record<string, number>;
}

export interface CardSliceState {
  cardholderAccounts: string[];
  priorityTokensByAddress: Record<string, CardTokenAllowance | null>;
  lastFetchedByAddress: Record<string, Date | string | null>;
  authenticatedPriorityToken: CardTokenAllowance | null;
  authenticatedPriorityTokenLastFetched: Date | string | null;
  hasViewedCardButton: boolean;
  isLoaded: boolean;
  alwaysShowCardButton: boolean;
  geoLocation: string;
  isAuthenticated: boolean;
  userCardLocation: CardLocation;
  onboarding: OnboardingState;
  cache: CacheState;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
  authenticatedPriorityToken: null,
  authenticatedPriorityTokenLastFetched: null,
  hasViewedCardButton: false,
  isLoaded: false,
  alwaysShowCardButton: false,
  geoLocation: 'UNKNOWN',
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    selectedCountry: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  cache: {
    data: {},
    timestamps: {},
  },
};

// Async thunk for loading cardholder accounts
export const loadCardholderAccounts = createAsyncThunk(
  'card/loadCardholderAccounts',
  getCardholder,
);

// Async thunk for verifying card authentication
export const verifyCardAuthentication = createAsyncThunk(
  'card/verifyCardAuthentication',
  handleLocalAuthentication,
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
    setAlwaysShowCardButton: (state, action: PayloadAction<boolean>) => {
      state.alwaysShowCardButton = action.payload;
    },
    setIsAuthenticatedCard: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setUserCardLocation: (
      state,
      action: PayloadAction<CardLocation | null>,
    ) => {
      state.userCardLocation = action.payload ?? 'international';
    },
    setOnboardingId: (state, action: PayloadAction<string | null>) => {
      state.onboarding.onboardingId = action.payload;
    },
    setSelectedCountry: (state, action: PayloadAction<Region | null>) => {
      state.onboarding.selectedCountry = action.payload;
    },
    setContactVerificationId: (state, action: PayloadAction<string | null>) => {
      state.onboarding.contactVerificationId = action.payload;
    },
    setConsentSetId: (state, action: PayloadAction<string | null>) => {
      state.onboarding.consentSetId = action.payload;
    },
    resetOnboardingState: (state) => {
      state.onboarding = {
        onboardingId: null,
        selectedCountry: null,
        contactVerificationId: null,
        consentSetId: null,
      };
    },
    resetAuthenticatedData: (state) => {
      state.authenticatedPriorityToken = null;
      state.authenticatedPriorityTokenLastFetched = null;
      state.userCardLocation = 'international';
      state.isAuthenticated = false;
    },
    setCacheData: (
      state,
      action: PayloadAction<{ key: string; data: unknown; timestamp: number }>,
    ) => {
      const { key, data, timestamp } = action.payload;
      state.cache.data[key] = data;
      state.cache.timestamps[key] = timestamp;
    },
    clearCacheData: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.cache.data[key];
      delete state.cache.timestamps[key];
    },
    clearAllCache: (state) => {
      state.cache.data = {};
      state.cache.timestamps = {};
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
      })
      .addCase(verifyCardAuthentication.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload.isAuthenticated;
        state.userCardLocation =
          action.payload.userCardLocation ?? 'international';
      })
      .addCase(verifyCardAuthentication.rejected, (state, action) => {
        Logger.log(
          'cardSlice::Error verifying card authentication',
          action?.error?.message,
        );
        state.isAuthenticated = false;
        state.authenticatedPriorityToken = null;
        state.authenticatedPriorityTokenLastFetched = null;
        state.userCardLocation = 'international';
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

export const selectHasCardholderAccounts = createSelector(
  selectCardholderAccounts,
  (cardholderAccounts) => cardholderAccounts.length > 0,
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

export const selectIsAuthenticatedCard = createSelector(
  selectCardState,
  (card) => card.isAuthenticated,
);

export const selectUserCardLocation = createSelector(
  selectCardState,
  (card) => card.userCardLocation,
);

export const selectDisplayCardButton = createSelector(
  selectIsCardholder,
  selectAlwaysShowCardButton,
  selectCardGeoLocation,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
  selectIsAuthenticatedCard,
  (
    isCardholder,
    alwaysShowCardButton,
    geoLocation,
    cardSupportedCountries,
    displayCardButtonFeatureFlag,
    isAuthenticated,
  ) => {
    if (
      alwaysShowCardButton ||
      isCardholder ||
      isAuthenticated ||
      ((cardSupportedCountries as Record<string, boolean>)?.[geoLocation] ===
        true &&
        displayCardButtonFeatureFlag)
    ) {
      return true;
    }

    return false;
  },
);

export const selectOnboardingId = createSelector(
  selectCardState,
  (card) => card.onboarding.onboardingId,
);

export const selectSelectedCountry = createSelector(
  selectCardState,
  (card) => card.onboarding.selectedCountry,
);

export const selectContactVerificationId = createSelector(
  selectCardState,
  (card) => card.onboarding.contactVerificationId,
);

export const selectConsentSetId = createSelector(
  selectCardState,
  (card) => card.onboarding.consentSetId,
);

// Actions
export const {
  resetCardState,
  setAlwaysShowCardButton,
  setHasViewedCardButton,
  setIsAuthenticatedCard,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setUserCardLocation,
  setOnboardingId,
  setSelectedCountry,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  setCacheData,
  clearCacheData,
  clearAllCache,
  resetAuthenticatedData,
} = actions;
