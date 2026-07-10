import {
  selectCompletedOnboarding,
  selectOnboardingAccountType,
  selectOnboardingQuestionnaire,
  selectOnboardingInterests,
  selectOnboardingInterestOtherText,
  selectOnboardingCryptoExperience,
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

  it('returns the correct value for selectCompletedOnboarding', () => {
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

  describe('questionnaire selectors', () => {
    const stateWithQuestionnaire = {
      onboarding: {
        completedOnboarding: true,
        questionnaire: {
          interests: ['swap_tokens', 'other'],
          interestOtherText: 'staking',
          cryptoExperience: 'beginner',
        },
      },
    } as RootState;

    it('returns the questionnaire answers', () => {
      expect(selectOnboardingQuestionnaire(stateWithQuestionnaire)).toEqual({
        interests: ['swap_tokens', 'other'],
        interestOtherText: 'staking',
        cryptoExperience: 'beginner',
      });
      expect(selectOnboardingInterests(stateWithQuestionnaire)).toEqual([
        'swap_tokens',
        'other',
      ]);
      expect(selectOnboardingInterestOtherText(stateWithQuestionnaire)).toBe(
        'staking',
      );
      expect(selectOnboardingCryptoExperience(stateWithQuestionnaire)).toBe(
        'beginner',
      );
    });

    it('returns safe defaults when the questionnaire is missing (partial rehydration)', () => {
      const state = { onboarding: { completedOnboarding: false } } as RootState;
      expect(selectOnboardingQuestionnaire(state)).toEqual({ interests: [] });
      expect(selectOnboardingInterests(state)).toEqual([]);
      expect(selectOnboardingInterestOtherText(state)).toBeUndefined();
      expect(selectOnboardingCryptoExperience(state)).toBeUndefined();
    });
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

    it('selectShouldShowWalletHomeOnboardingSteps is false when flow is suppressed', () => {
      expect(
        selectShouldShowWalletHomeOnboardingSteps.resultFunc(false, {
          ...WALLET_HOME_ONBOARDING_STEPS_INITIAL,
          suppressedReason: 'flow_completed',
        }),
      ).toBe(false);
    });

    it('selectShouldShowWalletHomeOnboardingSteps is true when eligible and not suppressed', () => {
      expect(
        selectShouldShowWalletHomeOnboardingSteps.resultFunc(
          true,
          WALLET_HOME_ONBOARDING_STEPS_INITIAL,
        ),
      ).toBe(true);
    });
  });
});
