import {
  saveOnboardingEvent,
  clearOnboardingEvents,
  setCompletedOnboarding,
  setSeedlessOnboardingMigrationVersion,
  SAVE_EVENT,
  CLEAR_EVENTS,
  SET_COMPLETED_ONBOARDING,
  SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION,
  SeedlessOnboardingMigrationVersion,
} from '.';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

describe('Onboarding actions', () => {
  describe('saveOnboardingEvent', () => {
    it('creates an action to save onboarding events', () => {
      const mockEvent = {
        name: 'test_event',
      } as ITrackingEvent;
      expect(saveOnboardingEvent([mockEvent])).toEqual({
        type: SAVE_EVENT,
        event: [mockEvent],
      });
    });
  });

  describe('clearOnboardingEvents', () => {
    it('creates an action to clear onboarding events', () => {
      expect(clearOnboardingEvents()).toEqual({
        type: CLEAR_EVENTS,
      });
    });
  });

  describe('setCompletedOnboarding', () => {
    it('creates an action to set completedOnboarding', () => {
      const completedOnboarding = true;
      expect(setCompletedOnboarding(completedOnboarding)).toEqual({
        type: SET_COMPLETED_ONBOARDING,
        completedOnboarding,
      });
    });
  });

  describe('setSeedlessOnboardingMigrationVersion', () => {
    it('creates an action to set seedless onboarding migration version', () => {
      const version = SeedlessOnboardingMigrationVersion.DataType;
      expect(setSeedlessOnboardingMigrationVersion(version)).toEqual({
        type: SET_SEEDLESS_ONBOARDING_MIGRATION_VERSION,
        version,
      });
    });
  });
});
