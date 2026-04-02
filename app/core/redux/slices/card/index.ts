import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';

export interface OnboardingState {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
}

export interface CardSliceState {
  hasViewedCardButton: boolean;
  isAuthenticated: boolean;
  onboarding: OnboardingState;
  isDaimoDemo: boolean;
}

export const initialState: CardSliceState = {
  hasViewedCardButton: false,
  isAuthenticated: false,
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  isDaimoDemo: false,
};

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
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectCardState = (state: RootState) => state[name];

export const selectHasViewedCardButton = createSelector(
  selectCardState,
  (card) => card.hasViewedCardButton,
);

/**
 * Re-exported from cardController selectors — reads from controller state,
 * which is populated by validateAndRefreshSession() on app unlock.
 */
export { selectIsCardAuthenticated as selectIsAuthenticatedCard };

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
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  resetAuthenticatedData,
  setIsDaimoDemo,
} = actions;
