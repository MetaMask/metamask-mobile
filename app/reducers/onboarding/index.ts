/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  SET_ONBOARDING_INTERESTS,
  SET_ONBOARDING_CRYPTO_EXPERIENCE,
  SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
  SET_SEEDLESS_ONBOARDING,
  CLEAR_SEEDLESS_ONBOARDING,
  SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT,
  CLEAR_ONBOARDING,
  SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE,
  RESET_WALLET_HOME_ONBOARDING_STEPS,
  SET_WALLET_HOME_ONBOARDING_STEPS_STEP,
  SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';
import {
  WALLET_HOME_ONBOARDING_STEPS_INITIAL,
  type WalletHomeOnboardingStepsState,
} from '../../constants/walletHomeOnboardingSteps';

/**
 * Answers the user gave during the onboarding questionnaires. These were
 * previously only sent to analytics; they are kept here so the rest of the app
 * can read the user's stated interests / experience.
 */
export interface OnboardingQuestionnaireState {
  /** Interest option ids selected on the interest questionnaire. */
  interests: string[];
  /** Free-text entered for the "Other" interest option, if any. */
  interestOtherText?: string;
  /** Selected crypto-experience level ('new' | 'beginner' | ...). */
  cryptoExperience?: string;
}

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  accountType?: AccountType;
  onboardingVersion?: string;

  /** Stored answers from the onboarding questionnaires. */
  questionnaire: OnboardingQuestionnaireState;

  // used to backfill analytic preferences selected event for social login users
  pendingSocialLoginMarketingConsentBackfill: string | null;

  seedlessOnboarding?: {
    clientId: string;
    authConnection: AuthConnection;
  };

  /** Epoch ms when the user last dismissed the iOS Google version warning sheet; null if never shown. */
  iosGoogleWarningSheetLastDismissedAt: number | null;

  /**
   * When true, the user may see the wallet home post-onboarding steps (empty-balance UX).
   * Set only from first-time onboarding success paths; cleared on wallet delete.
   */
  walletHomeOnboardingStepsEligible: boolean;

  /**
   * Session-only: show the first checklist step immediately without waiting for aggregated
   * balance fetch (fresh-from-onboarding path). Not persisted — unlock/relaunch uses loading shell.
   */
  walletHomeOnboardingSkipInitialBalanceWait: boolean;

  /** Present after migration 135; absent only on partially rehydrated legacy state. */
  walletHomeOnboardingSteps?: WalletHomeOnboardingStepsState;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
  questionnaire: { interests: [] },
  pendingSocialLoginMarketingConsentBackfill: null,
  iosGoogleWarningSheetLastDismissedAt: null,
  walletHomeOnboardingStepsEligible: false,
  walletHomeOnboardingSkipInitialBalanceWait: false,
  walletHomeOnboardingSteps: { ...WALLET_HOME_ONBOARDING_STEPS_INITIAL },
};

/**
 * Reducer to keep track of user oboarding actions:
 * - send it to analytics if the user decides to optin after finishing onboarding flow
 * - update the state of the onboarding flow
 */
const onboardingReducer = (
  state = initialOnboardingState,
  action: OnboardingActionTypes,
) => {
  switch (action.type) {
    case SAVE_EVENT:
      return {
        ...state,
        events: [...state.events, action.event],
      };
    case CLEAR_EVENTS:
      return {
        ...state,
        events: [],
      };
    case SET_COMPLETED_ONBOARDING:
      return {
        ...state,
        completedOnboarding: action.completedOnboarding,
      };
    case SET_ACCOUNT_TYPE:
      return {
        ...state,
        accountType: action.accountType,
        onboardingVersion: action.onboardingVersion,
      };
    case CLEAR_ACCOUNT_TYPE:
      return {
        ...state,
        accountType: undefined,
        onboardingVersion: undefined,
      };
    case SET_ONBOARDING_INTERESTS:
      return {
        ...state,
        questionnaire: {
          ...(state.questionnaire ?? { interests: [] }),
          interests: action.interests,
          interestOtherText: action.otherText,
        },
      };
    case SET_ONBOARDING_CRYPTO_EXPERIENCE:
      return {
        ...state,
        questionnaire: {
          ...(state.questionnaire ?? { interests: [] }),
          cryptoExperience: action.cryptoExperience,
        },
      };
    case SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL:
      return {
        ...state,
        pendingSocialLoginMarketingConsentBackfill: action.authConnection,
      };
    case SET_SEEDLESS_ONBOARDING:
      return {
        ...state,
        seedlessOnboarding: {
          clientId: action.clientId,
          authConnection: action.authConnection,
        },
      };
    case CLEAR_SEEDLESS_ONBOARDING:
      return {
        ...state,
        seedlessOnboarding: undefined,
      };
    case SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT:
      return {
        ...state,
        iosGoogleWarningSheetLastDismissedAt:
          action.iosGoogleWarningSheetLastDismissedAt,
      };
    case CLEAR_ONBOARDING:
      return { ...initialOnboardingState };
    case SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE:
      return {
        ...state,
        walletHomeOnboardingStepsEligible: action.eligible,
        walletHomeOnboardingSkipInitialBalanceWait:
          action.eligible && action.skipInitialBalanceWait === true,
      };
    case RESET_WALLET_HOME_ONBOARDING_STEPS:
      return {
        ...state,
        walletHomeOnboardingSteps: { ...WALLET_HOME_ONBOARDING_STEPS_INITIAL },
      };
    case SET_WALLET_HOME_ONBOARDING_STEPS_STEP: {
      const stepsState = state.walletHomeOnboardingSteps ?? {
        ...WALLET_HOME_ONBOARDING_STEPS_INITIAL,
      };
      return {
        ...state,
        walletHomeOnboardingSteps: {
          ...stepsState,
          stepIndex: Math.max(0, action.stepIndex),
        },
      };
    }
    case SUPPRESS_WALLET_HOME_ONBOARDING_STEPS: {
      const stepsState = state.walletHomeOnboardingSteps ?? {
        ...WALLET_HOME_ONBOARDING_STEPS_INITIAL,
      };
      return {
        ...state,
        walletHomeOnboardingSteps: {
          ...stepsState,
          suppressedReason: action.reason,
        },
        walletHomeOnboardingSkipInitialBalanceWait: false,
        ...(action.reason === 'account_funded'
          ? { walletHomeOnboardingStepsEligible: false }
          : {}),
      };
    }
    default:
      return state;
  }
};

export default onboardingReducer;
