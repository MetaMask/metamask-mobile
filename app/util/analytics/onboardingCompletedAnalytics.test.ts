import {
  getOnboardingCompletedAnalyticsProps,
  normalizeOnboardingCompletedAccountType,
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

describe('normalizeOnboardingCompletedAccountType', () => {
  it('maps social login account types to schema account_type enums', () => {
    expect(normalizeOnboardingCompletedAccountType('metamask_google')).toBe(
      'metamask',
    );
    expect(normalizeOnboardingCompletedAccountType('imported_apple')).toBe(
      'imported',
    );
  });

  it('preserves supported hardware account types', () => {
    expect(normalizeOnboardingCompletedAccountType('Ledger')).toBe('Ledger');
    expect(normalizeOnboardingCompletedAccountType('QR Hardware')).toBe(
      'QR Hardware',
    );
  });
});

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
      getOnboardingCompletedAnalyticsProps(
        {
          ...walletSetupCompletedProps,
          account_type: 'metamask_google',
        },
        true,
      ),
    ).toEqual({
      ...walletSetupCompletedProps,
      account_type: 'metamask',
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SOCIAL_LOGIN,
    });
  });
});
