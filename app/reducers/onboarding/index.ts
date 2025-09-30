/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  CLEAR_ONBOARDING_DEEPLINK,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ONBOARDING_DEEPLINK,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

export type OnboardingDeepLinkType = 'google' | 'apple' | 'import_srp';

export const ONBOARDING_DEEPLINK_TYPES: OnboardingDeepLinkType[] = [
  'google',
  'apple',
  'import_srp',
] as const;

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  onboardingDeepLink: OnboardingDeepLinkType | undefined;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
  onboardingDeepLink: undefined,
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
    case SET_ONBOARDING_DEEPLINK: {
      return {
        ...state,
        onboardingDeepLink: action.onboardingDeepLink,
      };
    }
    case CLEAR_ONBOARDING_DEEPLINK: {
      return {
        ...state,
        onboardingDeepLink: undefined,
      };
    }
    default:
      return state;
  }
};

export default onboardingReducer;
