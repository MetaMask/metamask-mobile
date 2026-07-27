import {
  getOnboardingCompletedAnalyticsProps,
  getOnboardingCompletedAnalyticsPropsFromSuccessFlow,
  getWalletSetupPropsFromSuccessFlow,
  normalizeOnboardingCompletedAccountType,
  OnboardingCompletedAccountType,
  ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
  ONBOARDING_TYPE_SEED_PHRASE,
  ONBOARDING_TYPE_SOCIAL_LOGIN,
} from './onboardingCompletedAnalytics';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../constants/onboarding';

describe('normalizeOnboardingCompletedAccountType', () => {
  it('maps social account types to schema account types', () => {
    expect(normalizeOnboardingCompletedAccountType('metamask_google')).toBe(
      OnboardingCompletedAccountType.Metamask,
    );
    expect(normalizeOnboardingCompletedAccountType('imported_apple')).toBe(
      OnboardingCompletedAccountType.Imported,
    );
  });

  it('preserves hardware wallet account types', () => {
    expect(normalizeOnboardingCompletedAccountType('Ledger')).toBe(
      OnboardingCompletedAccountType.Ledger,
    );
    expect(normalizeOnboardingCompletedAccountType('QR Hardware')).toBe(
      OnboardingCompletedAccountType.QrHardware,
    );
  });
});

describe('getWalletSetupPropsFromSuccessFlow', () => {
  it('returns import props for seed phrase import flow', () => {
    expect(
      getWalletSetupPropsFromSuccessFlow(
        ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      ),
    ).toEqual({
      wallet_setup_type: 'import',
      new_wallet: false,
      isSocialLogin: false,
    });
  });

  it('returns social login props for seedless onboarding flow', () => {
    expect(
      getWalletSetupPropsFromSuccessFlow(
        ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
      ),
    ).toEqual({
      wallet_setup_type: 'new',
      new_wallet: true,
      isSocialLogin: true,
    });
  });
});

describe('getOnboardingCompletedAnalyticsProps', () => {
  it('adds native implementation and seed phrase onboarding type', () => {
    expect(
      getOnboardingCompletedAnalyticsProps(
        {
          wallet_setup_type: 'new',
          new_wallet: true,
          account_type: AccountType.Metamask,
          is_basic_functionality_enabled: true,
        },
        false,
      ),
    ).toEqual({
      wallet_setup_type: 'new',
      new_wallet: true,
      account_type: OnboardingCompletedAccountType.Metamask,
      is_basic_functionality_enabled: true,
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SEED_PHRASE,
    });
  });

  it('adds social login onboarding type when requested', () => {
    expect(
      getOnboardingCompletedAnalyticsProps(
        {
          wallet_setup_type: 'new',
          new_wallet: true,
          account_type: AccountType.MetamaskGoogle,
        },
        true,
      ),
    ).toEqual({
      wallet_setup_type: 'new',
      new_wallet: true,
      account_type: OnboardingCompletedAccountType.Metamask,
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SOCIAL_LOGIN,
    });
  });
});

describe('getOnboardingCompletedAnalyticsPropsFromSuccessFlow', () => {
  it('builds import onboarding completed props', () => {
    expect(
      getOnboardingCompletedAnalyticsPropsFromSuccessFlow(
        ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
        {
          accountType: AccountType.Imported,
          isBasicFunctionalityEnabled: true,
        },
      ),
    ).toEqual({
      wallet_setup_type: 'import',
      new_wallet: false,
      account_type: OnboardingCompletedAccountType.Imported,
      is_basic_functionality_enabled: true,
      implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
      onboarding_type: ONBOARDING_TYPE_SEED_PHRASE,
    });
  });
});
