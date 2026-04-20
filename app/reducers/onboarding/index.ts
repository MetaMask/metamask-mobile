/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
  SET_SEEDLESS_ONBOARDING,
  CLEAR_SEEDLESS_ONBOARDING,
  SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT,
  CLEAR_ONBOARDING,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  accountType?: AccountType;
  onboardingVersion?: string;

  // used to backfill analytic preferences selected event for social login users
  pendingSocialLoginMarketingConsentBackfill: string | null;

  seedlessOnboarding?: {
    clientId: string;
    authConnection: AuthConnection;
  };

  /** Epoch ms when the user last dismissed the iOS Google version warning sheet; null if never shown. */
  iosGoogleWarningSheetLastDismissedAt: number | null;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
  pendingSocialLoginMarketingConsentBackfill: null,

  iosGoogleWarningSheetLastDismissedAt: null,
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
    default:
      return state;
  }
};

export default onboardingReducer;
