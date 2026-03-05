import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';
export const SET_COMPLETED_ONBOARDING = 'SET_COMPLETED_ONBOARDING';
export const SET_ACCOUNT_TYPE = 'SET_ACCOUNT_TYPE';
export const CLEAR_ACCOUNT_TYPE = 'CLEAR_ACCOUNT_TYPE';

interface SaveEventAction {
  type: typeof SAVE_EVENT;
  event: [ITrackingEvent];
}

interface ClearEventsAction {
  type: typeof CLEAR_EVENTS;
}

export interface SetCompletedOnboardingAction {
  type: typeof SET_COMPLETED_ONBOARDING;
  completedOnboarding: boolean;
}

interface SetAccountTypeAction {
  type: typeof SET_ACCOUNT_TYPE;
  accountType: string;
}

interface ClearAccountTypeAction {
  type: typeof CLEAR_ACCOUNT_TYPE;
}

export type OnboardingActionTypes =
  | SaveEventAction
  | ClearEventsAction
  | SetCompletedOnboardingAction
  | SetAccountTypeAction
  | ClearAccountTypeAction;

export function saveOnboardingEvent(
  eventArgs: [ITrackingEvent],
): SaveEventAction {
  return {
    type: SAVE_EVENT,
    event: eventArgs,
  };
}

export function clearOnboardingEvents(): ClearEventsAction {
  return {
    type: CLEAR_EVENTS,
  };
}

export function setCompletedOnboarding(
  completedOnboarding: boolean,
): SetCompletedOnboardingAction {
  return {
    type: SET_COMPLETED_ONBOARDING,
    completedOnboarding,
  };
}

export function setAccountType(accountType: string): SetAccountTypeAction {
  return {
    type: SET_ACCOUNT_TYPE,
    accountType,
  };
}

export function clearAccountType(): ClearAccountTypeAction {
  return {
    type: CLEAR_ACCOUNT_TYPE,
  };
}
