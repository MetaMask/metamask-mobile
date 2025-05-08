import {
  saveOnboardingEvent,
  clearOnboardingEvents,
  setCompletedOnboarding,
  SAVE_EVENT,
  CLEAR_EVENTS,
  SET_COMPLETED_ONBOARDING,
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
});
