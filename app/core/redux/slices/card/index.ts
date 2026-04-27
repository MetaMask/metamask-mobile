import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import type {
  CardFundingToken,
  LimitType,
} from '../../../../components/UI/Card/types';

export interface OnboardingState {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
}

export interface CardDelegationState {
  flow: 'onboarding' | 'manage' | 'enable' | null;
  canChangeToken: boolean;
  selectedToken: CardFundingToken | null;
  limitType: LimitType;
  customLimit: string;
  isSubmitting: boolean;
}

export interface CardSliceState {
  hasViewedCardButton: boolean;
  onboarding: OnboardingState;
  isDaimoDemo: boolean;
  delegation: CardDelegationState;
}

export const initialState: CardSliceState = {
  hasViewedCardButton: false,
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
  },
  isDaimoDemo: false,
  delegation: {
    flow: null,
    canChangeToken: true,
    selectedToken: null,
    limitType: 'full',
    customLimit: '',
    isSubmitting: false,
  },
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
    resetOnboardingState: (state) => {
      state.onboarding = {
        onboardingId: null,
        contactVerificationId: null,
        consentSetId: null,
      };
    },
    setDelegationFlow: (
      state,
      action: PayloadAction<{
        flow: CardDelegationState['flow'];
        canChangeToken: boolean;
        selectedToken: CardFundingToken | null;
      }>,
    ) => {
      state.delegation.flow = action.payload.flow;
      state.delegation.canChangeToken = action.payload.canChangeToken;
      state.delegation.selectedToken = action.payload.selectedToken;
    },
    setDelegationSelectedToken: (
      state,
      action: PayloadAction<CardFundingToken>,
    ) => {
      state.delegation.selectedToken = action.payload;
    },
    setDelegationLimit: (
      state,
      action: PayloadAction<{ limitType: LimitType; customLimit: string }>,
    ) => {
      state.delegation.limitType = action.payload.limitType;
      state.delegation.customLimit = action.payload.customLimit;
    },
    setDelegationSubmitting: (state, action: PayloadAction<boolean>) => {
      state.delegation.isSubmitting = action.payload;
    },
    resetDelegationState: (state) => {
      state.delegation = initialState.delegation;
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

export const selectCardDelegationState = createSelector(
  selectCardState,
  (card) => card.delegation,
);

export const selectDelegationIsSubmitting = createSelector(
  selectCardState,
  (card) => card.delegation.isSubmitting,
);

// Actions
export const {
  resetCardState,
  setHasViewedCardButton,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  resetOnboardingState,
  setIsDaimoDemo,
  setDelegationFlow,
  setDelegationSelectedToken,
  setDelegationLimit,
  setDelegationSubmitting,
  resetDelegationState,
} = actions;
