import onboardingReducer, { initialOnboardingState } from '.';
import {
  setPendingSocialLoginMarketingConsentBackfill,
  setCompletedOnboarding,
} from '../../actions/onboarding';

describe('onboardingReducer', () => {
  it('sets completedOnboarding', () => {
    const newState = onboardingReducer(
      initialOnboardingState,
      setCompletedOnboarding(true),
    );

    expect(newState).toEqual({
      ...initialOnboardingState,
      completedOnboarding: true,
    });
  });

  it('sets onboarding.seedless pending social login marketing consent backfill', () => {
    const newState = onboardingReducer(
      initialOnboardingState,
      setPendingSocialLoginMarketingConsentBackfill('google'),
    );

    expect(newState).toEqual({
      ...initialOnboardingState,
      seedless: {
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    });
  });
});
