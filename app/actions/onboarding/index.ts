import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';
export const SET_COMPLETED_ONBOARDING = 'SET_COMPLETED_ONBOARDING';
export const SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION =
  'SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION';

/**
 * Seedless onboarding migration versions.
 * - DataType (1): Assigns PrimarySrp/ImportedSrp/ImportedPrivateKey to legacy secrets
 */
export enum SeedlessOnboardingMigrationVersion {
  DataType = 1,
}

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

export interface SetSeedlessOnboardingMigrationVersionAction {
  type: typeof SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION;
  version: number;
}

export type OnboardingActionTypes =
  | SaveEventAction
  | ClearEventsAction
  | SetCompletedOnboardingAction
  | SetSeedlessOnboardingMigrationVersionAction;

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

export function setSeedlessOnboardingMigrationVersion(
  version: number,
): SetSeedlessOnboardingMigrationVersionAction {
  return {
    type: SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION,
    version,
  };
}
