import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { OnboardingDeepLinkType } from '../../reducers/onboarding';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';
export const SET_COMPLETED_ONBOARDING = 'SET_COMPLETED_ONBOARDING';
export const SET_ONBOARDING_DEEPLINK = 'SET_ONBOARDING_DEEPLINK';
export const CLEAR_ONBOARDING_DEEPLINK = 'CLEAR_ONBOARDING_DEEPLINK';

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

export interface SetOnboardingDeepLinkAction {
  type: typeof SET_ONBOARDING_DEEPLINK;
  onboardingDeepLink: OnboardingDeepLinkType | undefined;
}

export interface ClearOnboardingDeepLinkAction {
  type: typeof CLEAR_ONBOARDING_DEEPLINK;
}

export type OnboardingActionTypes =
  | SaveEventAction
  | ClearEventsAction
  | SetCompletedOnboardingAction
  | SetOnboardingDeepLinkAction
  | ClearOnboardingDeepLinkAction;

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

export function setOnboardingDeepLink(
  onboardingDeepLink: OnboardingDeepLinkType,
): SetOnboardingDeepLinkAction {
  return {
    type: SET_ONBOARDING_DEEPLINK,
    onboardingDeepLink,
  };
}

export function clearOnboardingDeepLink(): ClearOnboardingDeepLinkAction {
  return {
    type: CLEAR_ONBOARDING_DEEPLINK,
  };
}
