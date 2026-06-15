import {
  getOnboardingCompletedAnalyticsProps,
  ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
  ONBOARDING_TYPE_SEED_PHRASE,
  ONBOARDING_TYPE_SOCIAL_LOGIN,
} from './onboardingCompletedAnalytics';

describe('getOnboardingCompletedAnalyticsProps', () => {
  it('returns native implementation and seed_phrase onboarding type', () => {
    expect(getOnboardingCompletedAnalyticsProps(false)).toEqual({
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SEED_PHRASE,
    });
  });

  it('returns native implementation and social_login onboarding type', () => {
    expect(getOnboardingCompletedAnalyticsProps(true)).toEqual({
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SOCIAL_LOGIN,
    });
  });
});
