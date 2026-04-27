import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';
import type { WalletHomeOnboardingStepsSuppressedReason } from '../../constants/walletHomeOnboardingSteps';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';
export const SET_COMPLETED_ONBOARDING = 'SET_COMPLETED_ONBOARDING';
export const SET_ACCOUNT_TYPE = 'SET_ACCOUNT_TYPE';
export const CLEAR_ACCOUNT_TYPE = 'CLEAR_ACCOUNT_TYPE';
export const SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL =
  'SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL';
export const SET_SEEDLESS_ONBOARDING = 'SET_SEEDLESS_ONBOARDING';
export const CLEAR_SEEDLESS_ONBOARDING = 'CLEAR_SEEDLESS_ONBOARDING';
export const SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT =
  'SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT';
export const CLEAR_ONBOARDING = 'CLEAR_ONBOARDING';
export const SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE =
  'SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE';
export const RESET_WALLET_HOME_ONBOARDING_STEPS =
  'RESET_WALLET_HOME_ONBOARDING_STEPS';
export const SET_WALLET_HOME_ONBOARDING_STEPS_STEP =
  'SET_WALLET_HOME_ONBOARDING_STEPS_STEP';
export const SUPPRESS_WALLET_HOME_ONBOARDING_STEPS =
  'SUPPRESS_WALLET_HOME_ONBOARDING_STEPS';

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

export interface SetIosGoogleWarningSheetLastDismissedAtAction {
  type: typeof SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT;
  iosGoogleWarningSheetLastDismissedAt: number;
}

export interface ClearOnboardingAction {
  type: typeof CLEAR_ONBOARDING;
}

export interface SetWalletHomeOnboardingStepsEligibleAction {
  type: typeof SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE;
  eligible: boolean;
}

export interface ResetWalletHomeOnboardingStepsAction {
  type: typeof RESET_WALLET_HOME_ONBOARDING_STEPS;
}

export interface SetWalletHomeOnboardingStepsStepAction {
  type: typeof SET_WALLET_HOME_ONBOARDING_STEPS_STEP;
  stepIndex: number;
}

export interface SuppressWalletHomeOnboardingStepsAction {
  type: typeof SUPPRESS_WALLET_HOME_ONBOARDING_STEPS;
  reason: WalletHomeOnboardingStepsSuppressedReason;
}

export type OnboardingActionTypes =
  | SaveEventAction
  | ClearEventsAction
  | SetCompletedOnboardingAction
  | SetAccountTypeAction
  | ClearAccountTypeAction
  | SetPendingSocialLoginMarketingConsentBackfillAction
  | SetSeedlessOnboardingAction
  | ClearSeedlessOnboardingAction
  | SetIosGoogleWarningSheetLastDismissedAtAction
  | ClearOnboardingAction
  | SetWalletHomeOnboardingStepsEligibleAction
  | ResetWalletHomeOnboardingStepsAction
  | SetWalletHomeOnboardingStepsStepAction
  | SuppressWalletHomeOnboardingStepsAction;

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

export function setIosGoogleWarningSheetLastDismissedAt(
  iosGoogleWarningSheetLastDismissedAt: number,
): SetIosGoogleWarningSheetLastDismissedAtAction {
  return {
    type: SET_IOS_GOOGLE_WARNING_SHEET_LAST_DISMISSED_AT,
    iosGoogleWarningSheetLastDismissedAt,
  };
}

export function clearOnboarding(): ClearOnboardingAction {
  return {
    type: CLEAR_ONBOARDING,
  };
}

export function setWalletHomeOnboardingStepsEligible(
  eligible: boolean,
): SetWalletHomeOnboardingStepsEligibleAction {
  return {
    type: SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE,
    eligible,
  };
}

export function resetWalletHomeOnboardingSteps(): ResetWalletHomeOnboardingStepsAction {
  return {
    type: RESET_WALLET_HOME_ONBOARDING_STEPS,
  };
}

export function setWalletHomeOnboardingStepsStep(
  stepIndex: number,
): SetWalletHomeOnboardingStepsStepAction {
  return {
    type: SET_WALLET_HOME_ONBOARDING_STEPS_STEP,
    stepIndex,
  };
}

export function suppressWalletHomeOnboardingSteps(
  reason: WalletHomeOnboardingStepsSuppressedReason,
): SuppressWalletHomeOnboardingStepsAction {
  return {
    type: SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
    reason,
  };
}
