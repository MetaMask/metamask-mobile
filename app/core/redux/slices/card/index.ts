import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';

export type CardOnboardingCompletionIntent = 'moneyAccountCardLinking';

export interface OnboardingState {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
  completionIntent: CardOnboardingCompletionIntent | null;
}

export interface CardSliceState {
  hasViewedCardButton: boolean;
  onboarding: OnboardingState;
  isDaimoDemo: boolean;
}

export const initialState: CardSliceState = {
  hasViewedCardButton: false,
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
    completionIntent: null,
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
    setOnboardingCompletionIntent: (
      state,
      action: PayloadAction<CardOnboardingCompletionIntent | null>,
    ) => {
      state.onboarding.completionIntent = action.payload;
    },
    resetOnboardingState: (state) => {
      state.onboarding = {
        onboardingId: null,
        contactVerificationId: null,
        consentSetId: null,
        completionIntent: null,
      };
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

export const selectOnboardingCompletionIntent = createSelector(
  selectCardState,
  (card) => card.onboarding.completionIntent ?? null,
);

// Actions
export const {
  resetCardState,
  setHasViewedCardButton,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  setOnboardingCompletionIntent,
  resetOnboardingState,
  setIsDaimoDemo,
} = actions;
