/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
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
    default:
      return state;
  }
};

export default onboardingReducer;
