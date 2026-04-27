import { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import { shouldMarkWalletHomeOnboardingStepsEligible } from './walletHomeOnboardingStepsEligibility';

describe('shouldMarkWalletHomeOnboardingStepsEligible', () => {
  it.each([
    ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
    ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
    ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
  ])('returns true for first-time onboarding flow %s', (flow) => {
    expect(shouldMarkWalletHomeOnboardingStepsEligible(flow)).toBe(true);
  });

  it.each([
    ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP,
    ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP,
  ])('returns false for non-first-time flow %s', (flow) => {
    expect(shouldMarkWalletHomeOnboardingStepsEligible(flow)).toBe(false);
  });

  it('returns false when successFlow is undefined so callers must pass an explicit flow', () => {
    expect(shouldMarkWalletHomeOnboardingStepsEligible(undefined)).toBe(false);
  });
});
