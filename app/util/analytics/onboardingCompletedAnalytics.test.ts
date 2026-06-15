import {
  getOnboardingCompletedAnalyticsProps,
  ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
  ONBOARDING_TYPE_SEED_PHRASE,
  ONBOARDING_TYPE_SOCIAL_LOGIN,
} from './onboardingCompletedAnalytics';

const walletSetupCompletedProps = {
  wallet_setup_type: 'new' as const,
  new_wallet: true,
  account_type: 'metamask',
  utm_source: 'google',
};

describe('getOnboardingCompletedAnalyticsProps', () => {
  it('returns wallet setup completed props with native implementation and seed_phrase onboarding type', () => {
    expect(
      getOnboardingCompletedAnalyticsProps(walletSetupCompletedProps, false),
    ).toEqual({
      ...walletSetupCompletedProps,
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SEED_PHRASE,
    });
  });

  it('returns wallet setup completed props with native implementation and social_login onboarding type', () => {
    expect(
      getOnboardingCompletedAnalyticsProps(walletSetupCompletedProps, true),
    ).toEqual({
      ...walletSetupCompletedProps,
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SOCIAL_LOGIN,
    });
  });
});
