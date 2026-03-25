import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import { CardLocation } from '../../../../components/UI/Card/types';
import { handleLocalAuthentication } from '../../../../components/UI/Card/util/handleLocalAuthentication';

export interface OnboardingState {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
}

export interface CardSliceState {
  cardholderAccounts: string[];
  hasViewedCardButton: boolean;
  isLoaded: boolean;
  isAuthenticated: boolean;
  userCardLocation: CardLocation;
  onboarding: OnboardingState;
  isDaimoDemo: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  hasViewedCardButton: false,
  isLoaded: false,
  isAuthenticated: false,
  userCardLocation: 'international',
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  isDaimoDemo: false,
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
    setHasViewedCardButton: (state, action: PayloadAction<boolean>) => {
      state.hasViewedCardButton = action.payload;
    },
    setIsAuthenticatedCard: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setIsDaimoDemo: (state, action: PayloadAction<boolean>) => {
      state.isDaimoDemo = action.payload;
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
    setContactVerificationId: (state, action: PayloadAction<string | null>) => {
      state.onboarding.contactVerificationId = action.payload;
    },
    setConsentSetId: (state, action: PayloadAction<string | null>) => {
      state.onboarding.consentSetId = action.payload;
    },
    resetOnboardingState: (state) => {
      state.onboarding = {
        onboardingId: null,
        contactVerificationId: null,
        consentSetId: null,
      };
    },
    resetAuthenticatedData: (state) => {
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCardholderAccounts.fulfilled, (state, action) => {
        state.cardholderAccounts = action.payload.cardholderAddresses ?? [];
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
        if (action.payload.userCardLocation) {
          state.userCardLocation = action.payload.userCardLocation;
        }
      })
      .addCase(verifyCardAuthentication.rejected, (state, action) => {
        Logger.log(
          'cardSlice::Error verifying card authentication',
          action?.error?.message,
        );
        state.isAuthenticated = false;
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

export const selectCardIsLoaded = createSelector(
  selectCardState,
  (card) => card.isLoaded,
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

export const selectIsDaimoDemo = createSelector(
  selectCardState,
  (card) => card.isDaimoDemo,
);

export const selectOnboardingId = createSelector(
  selectCardState,
  (card) => card.onboarding.onboardingId,
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
  setHasViewedCardButton,
  setIsAuthenticatedCard,
  setUserCardLocation,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  resetAuthenticatedData,
  setIsDaimoDemo,
} = actions;
