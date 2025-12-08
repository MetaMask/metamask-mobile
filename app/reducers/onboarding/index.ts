/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  /** Tracks which seedless onboarding migrations have been applied */
  seedlessOnboardingMigrationVersion: number;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
  seedlessOnboardingMigrationVersion: 0,
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
    case SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION:
      return {
        ...state,
        seedlessOnboardingMigrationVersion: action.version,
      };
    default:
      return state;
  }
};

export default onboardingReducer;
