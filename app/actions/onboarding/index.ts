import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';
export const SET_COMPLETED_ONBOARDING = 'SET_COMPLETED_ONBOARDING';
export const SET_ACCOUNT_TYPE = 'SET_ACCOUNT_TYPE';
export const CLEAR_ACCOUNT_TYPE = 'CLEAR_ACCOUNT_TYPE';
export const SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL =
  'SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL';
export const SET_SEEDLESS_ONBOARDING = 'SET_SEEDLESS_ONBOARDING';
export const CLEAR_SEEDLESS_ONBOARDING = 'CLEAR_SEEDLESS_ONBOARDING';

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
  accountType: AccountType;
  onboardingVersion: string;
}

interface ClearAccountTypeAction {
  type: typeof CLEAR_ACCOUNT_TYPE;
}

export interface SetPendingSocialLoginMarketingConsentBackfillAction {
  type: typeof SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL;
  authConnection: string | null;
}

export interface SetSeedlessOnboardingAction {
  type: typeof SET_SEEDLESS_ONBOARDING;
  clientId: string;
  authConnection: AuthConnection;
}

export interface ClearSeedlessOnboardingAction {
  type: typeof CLEAR_SEEDLESS_ONBOARDING;
}

export type OnboardingActionTypes =
  | SaveEventAction
  | ClearEventsAction
  | SetCompletedOnboardingAction
  | SetAccountTypeAction
  | ClearAccountTypeAction
  | SetPendingSocialLoginMarketingConsentBackfillAction
  | SetSeedlessOnboardingAction
  | ClearSeedlessOnboardingAction;

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

export function setAccountType(params: {
  accountType: AccountType;
  onboardingVersion: string;
}): SetAccountTypeAction {
  return {
    type: SET_ACCOUNT_TYPE,
    accountType: params.accountType,
    onboardingVersion: params.onboardingVersion,
  };
}

export function clearAccountType(): ClearAccountTypeAction {
  return {
    type: CLEAR_ACCOUNT_TYPE,
  };
}

export function setPendingSocialLoginMarketingConsentBackfill(
  authConnection: string | null,
): SetPendingSocialLoginMarketingConsentBackfillAction {
  return {
    type: SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
    authConnection,
  };
}

export function setSeedlessOnboarding(params: {
  clientId: string;
  authConnection: AuthConnection;
}): SetSeedlessOnboardingAction {
  return {
    type: SET_SEEDLESS_ONBOARDING,
    clientId: params.clientId,
    authConnection: params.authConnection,
  };
}

export function clearSeedlessOnboarding(): ClearSeedlessOnboardingAction {
  return {
    type: CLEAR_SEEDLESS_ONBOARDING,
  };
}
