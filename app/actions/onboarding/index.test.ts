import {
  saveOnboardingEvent,
  clearOnboardingEvents,
  clearOnboarding,
  setCompletedOnboarding,
  setAccountType,
  clearAccountType,
  SAVE_EVENT,
  CLEAR_EVENTS,
  CLEAR_ONBOARDING,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  setWalletHomeOnboardingStepsEligible,
  SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE,
  resetWalletHomeOnboardingSteps,
  RESET_WALLET_HOME_ONBOARDING_STEPS,
  setWalletHomeOnboardingStepsStep,
  SET_WALLET_HOME_ONBOARDING_STEPS_STEP,
  suppressWalletHomeOnboardingSteps,
  SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
} from '.';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';

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

  describe('setAccountType', () => {
    it('creates an action to set accountType', () => {
      const onboardingVersion = '7.0.0 (1234)';

      expect(
        setAccountType({
          accountType: AccountType.Metamask,
          onboardingVersion,
        }),
      ).toEqual({
        type: SET_ACCOUNT_TYPE,
        accountType: AccountType.Metamask,
        onboardingVersion,
      });
    });

    it('creates an action with social login account type', () => {
      const onboardingVersion = '7.0.0 (1234)';

      expect(
        setAccountType({
          accountType: AccountType.MetamaskGoogle,
          onboardingVersion,
        }),
      ).toEqual({
        type: SET_ACCOUNT_TYPE,
        accountType: AccountType.MetamaskGoogle,
        onboardingVersion,
      });
    });
  });

  describe('clearAccountType', () => {
    it('creates an action to clear accountType', () => {
      expect(clearAccountType()).toEqual({
        type: CLEAR_ACCOUNT_TYPE,
      });
    });
  });

  describe('clearOnboarding', () => {
    it('creates an action to reset onboarding state', () => {
      expect(clearOnboarding()).toEqual({
        type: CLEAR_ONBOARDING,
      });
    });
  });

  describe('setWalletHomeOnboardingStepsEligible', () => {
    it('creates an action to set eligibility', () => {
      expect(setWalletHomeOnboardingStepsEligible(true)).toEqual({
        type: SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE,
        eligible: true,
      });
    });
  });

  describe('resetWalletHomeOnboardingSteps', () => {
    it('creates reset action', () => {
      expect(resetWalletHomeOnboardingSteps()).toEqual({
        type: RESET_WALLET_HOME_ONBOARDING_STEPS,
      });
    });
  });

  describe('setWalletHomeOnboardingStepsStep', () => {
    it('creates step action', () => {
      expect(setWalletHomeOnboardingStepsStep(2)).toEqual({
        type: SET_WALLET_HOME_ONBOARDING_STEPS_STEP,
        stepIndex: 2,
      });
    });
  });

  describe('suppressWalletHomeOnboardingSteps', () => {
    it('creates suppress action', () => {
      expect(suppressWalletHomeOnboardingSteps('flow_completed')).toEqual({
        type: SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
        reason: 'flow_completed',
      });
    });
  });
});
