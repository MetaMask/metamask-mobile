import {
  selectCompletedOnboarding,
  selectOnboardingAccountType,
  selectPendingSocialLoginMarketingConsentBackfill,
  selectWalletHomeOnboardingSteps,
  selectWalletHomeOnboardingStepsEligible,
  selectShouldShowWalletHomeOnboardingSteps,
} from '.';
import { RootState } from '../../reducers';
import { AccountType } from '../../constants/onboarding';
import { WALLET_HOME_ONBOARDING_STEPS_INITIAL } from '../../constants/walletHomeOnboardingSteps';

describe('Onboarding selectors', () => {
  const mockState = {
    onboarding: {
      completedOnboarding: true,
      accountType: AccountType.MetamaskGoogle,
    },
  } as RootState;

  it('returns the correct value for selectCompletedOnboarding ', () => {
    expect(selectCompletedOnboarding(mockState)).toEqual(
      mockState.onboarding.completedOnboarding,
    );
  });

  it('returns the correct value for selectOnboardingAccountType', () => {
    expect(selectOnboardingAccountType(mockState)).toEqual(
      AccountType.MetamaskGoogle,
    );
  });

  it('returns undefined for selectOnboardingAccountType when not set', () => {
    const stateWithoutAccountType = {
      onboarding: {
        completedOnboarding: false,
      },
    } as RootState;
    expect(
      selectOnboardingAccountType(stateWithoutAccountType),
    ).toBeUndefined();
  });

  it('returns null for selectPendingSocialLoginMarketingConsentBackfill when not set', () => {
    const state = {
      onboarding: {
        completedOnboarding: false,
      },
    } as RootState;
    expect(selectPendingSocialLoginMarketingConsentBackfill(state)).toBeNull();
  });

  it('returns the pending auth connection for selectPendingSocialLoginMarketingConsentBackfill', () => {
    const state = {
      onboarding: {
        completedOnboarding: true,
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    } as RootState;
    expect(selectPendingSocialLoginMarketingConsentBackfill(state)).toBe(
      'google',
    );
  });

  describe('wallet home onboarding steps (partial rehydration)', () => {
    it('selectWalletHomeOnboardingSteps returns initial when onboarding slice is missing', () => {
      const state = {} as RootState;
      expect(selectWalletHomeOnboardingSteps(state)).toEqual(
        WALLET_HOME_ONBOARDING_STEPS_INITIAL,
      );
    });

    it('selectWalletHomeOnboardingStepsEligible is false when onboarding slice is missing', () => {
      const state = {} as RootState;
      expect(selectWalletHomeOnboardingStepsEligible(state)).toBe(false);
    });

    it('selectShouldShowWalletHomeOnboardingSteps is false when onboarding slice is missing', () => {
      const state = {} as RootState;
      expect(selectShouldShowWalletHomeOnboardingSteps(state)).toBe(false);
    });
  });
});
