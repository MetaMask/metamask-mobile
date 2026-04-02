import {
  saveOnboardingEvent,
  clearOnboardingEvents,
  setCompletedOnboarding,
  setAccountType,
  clearAccountType,
  SAVE_EVENT,
  CLEAR_EVENTS,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  setWalletCreatedAtForFundsTracking,
  markWalletFundsObtainedFlowComplete,
  SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING,
  MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE,
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

  describe('setWalletCreatedAtForFundsTracking', () => {
    it('creates an action with timestamp', () => {
      expect(setWalletCreatedAtForFundsTracking(123)).toEqual({
        type: SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING,
        timestampMs: 123,
      });
    });
  });

  describe('markWalletFundsObtainedFlowComplete', () => {
    it('creates a completion action', () => {
      expect(markWalletFundsObtainedFlowComplete()).toEqual({
        type: MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE,
      });
    });
  });
});
