/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  accountType?: AccountType;
  onboardingVersion?: string;
  seedless: {
    pendingSocialLoginMarketingConsentBackfill: string | null;
  };
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
  seedless: {
    pendingSocialLoginMarketingConsentBackfill: null,
  },
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
        seedless: {
          ...state.seedless,
          pendingSocialLoginMarketingConsentBackfill: action.authConnection,
        },
      };
    default:
      return state;
  }
};

export default onboardingReducer;
