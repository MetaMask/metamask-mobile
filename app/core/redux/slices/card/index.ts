import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { CardEntryPoint } from '../../../../components/UI/Card/util/metrics';

export interface OnboardingState {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
  // Immersve funding source created at sign-up; consumed by the
  // spending-prerequisites flow (KYC / funding polling) in later steps.
  immersveFundingSourceId: string | null;
}

export interface CardSliceState {
  onboarding: OnboardingState;
  isDaimoDemo: boolean;
  pendingMoneyAccountCardLink: CardEntryPoint | null;
  cardArrivalAnimationSeen: boolean;
  /** Armed by the developer-options reset; consumed on arrival, not persisted. */
  cardArrivalPreviewRequested: boolean;
  /** One-time Apple Pay availability splash on Card Home. */
  applePaySplashSeen: boolean;
  /** One-time Apple Pay splash on wallet Home. */
  applePayHomeSplashSeen: boolean;
  /** Set when the wallet-home splash is shown. Not persisted. */
  applePayHomeSplashShownThisSession: boolean;
  /** User dismissed the wallet-home Apple Pay banner. */
  applePayHomeBannerDismissed: boolean;
}

export const initialState: CardSliceState = {
  onboarding: {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
    immersveFundingSourceId: null,
  },
  isDaimoDemo: false,
  pendingMoneyAccountCardLink: null,
  cardArrivalAnimationSeen: false,
  cardArrivalPreviewRequested: false,
  applePaySplashSeen: false,
  applePayHomeSplashSeen: false,
  applePayHomeSplashShownThisSession: false,
  applePayHomeBannerDismissed: false,
};

const name = 'card';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    resetCardState: () => initialState,
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
    setImmersveFundingSourceId: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.onboarding.immersveFundingSourceId = action.payload;
    },
    resetOnboardingState: (state) => {
      state.onboarding = {
        onboardingId: null,
        contactVerificationId: null,
        consentSetId: null,
        immersveFundingSourceId: null,
      };
    },
    setPendingMoneyAccountCardLink: (
      state,
      action: PayloadAction<CardEntryPoint | null>,
    ) => {
      state.pendingMoneyAccountCardLink = action.payload;
    },
    setCardArrivalAnimationSeen: (state, action: PayloadAction<boolean>) => {
      state.cardArrivalAnimationSeen = action.payload;
    },
    setCardArrivalPreviewRequested: (state, action: PayloadAction<boolean>) => {
      state.cardArrivalPreviewRequested = action.payload;
    },
    setApplePaySplashSeen: (state, action: PayloadAction<boolean>) => {
      state.applePaySplashSeen = action.payload;
    },
    setApplePayHomeSplashSeen: (state, action: PayloadAction<boolean>) => {
      state.applePayHomeSplashSeen = action.payload;
    },
    setApplePayHomeSplashShownThisSession: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.applePayHomeSplashShownThisSession = action.payload;
    },
    setApplePayHomeBannerDismissed: (state, action: PayloadAction<boolean>) => {
      state.applePayHomeBannerDismissed = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectCardState = (state: RootState) => state[name];

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

export const selectImmersveFundingSourceId = createSelector(
  selectCardState,
  (card) => card.onboarding.immersveFundingSourceId,
);

export const selectPendingMoneyAccountCardLink = createSelector(
  selectCardState,
  (card) => card.pendingMoneyAccountCardLink,
);

export const selectCardArrivalAnimationSeen = createSelector(
  selectCardState,
  (card) => card.cardArrivalAnimationSeen,
);

export const selectCardArrivalPreviewRequested = createSelector(
  selectCardState,
  (card) => card.cardArrivalPreviewRequested,
);

export const selectApplePaySplashSeen = createSelector(
  selectCardState,
  (card) => card?.applePaySplashSeen ?? false,
);

export const selectApplePayHomeSplashSeen = createSelector(
  selectCardState,
  (card) => card?.applePayHomeSplashSeen ?? false,
);

export const selectApplePayHomeSplashShownThisSession = createSelector(
  selectCardState,
  (card) => card?.applePayHomeSplashShownThisSession ?? false,
);

export const selectApplePayHomeBannerDismissed = createSelector(
  selectCardState,
  (card) => card?.applePayHomeBannerDismissed ?? false,
);

// Actions
export const {
  resetCardState,
  setOnboardingId,
  setContactVerificationId,
  setConsentSetId,
  setImmersveFundingSourceId,
  resetOnboardingState,
  setIsDaimoDemo,
  setPendingMoneyAccountCardLink,
  setCardArrivalAnimationSeen,
  setCardArrivalPreviewRequested,
  setApplePaySplashSeen,
  setApplePayHomeSplashSeen,
  setApplePayHomeSplashShownThisSession,
  setApplePayHomeBannerDismissed,
} = actions;
