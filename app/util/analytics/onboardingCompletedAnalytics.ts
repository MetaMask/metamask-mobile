import type { JsonMap } from '../../core/Analytics/MetaMetrics.types';
import type { WalletSetupCompletedAttributionAnalyticsPayload } from './walletSetupCompletedAttribution';

export const ONBOARDING_IMPLEMENTATION_TYPE_NATIVE = 'native' as const;

export const ONBOARDING_TYPE_SEED_PHRASE = 'seed_phrase' as const;
export const ONBOARDING_TYPE_SOCIAL_LOGIN = 'social_login' as const;

export type OnboardingType =
  | typeof ONBOARDING_TYPE_SEED_PHRASE
  | typeof ONBOARDING_TYPE_SOCIAL_LOGIN;

export type OnboardingCompletedAccountType =
  | 'metamask'
  | 'imported'
  | 'snap'
  | 'Ledger'
  | 'Trezor'
  | 'QR Hardware'
  | 'Lattice';

export interface WalletSetupCompletedAnalyticsProps extends JsonMap {
  wallet_setup_type: 'new' | 'import';
  new_wallet: boolean;
  account_type: string;
}

export interface OnboardingCompletedAnalyticsProps
  extends Omit<WalletSetupCompletedAnalyticsProps, 'account_type'>,
    WalletSetupCompletedAttributionAnalyticsPayload {
  account_type: OnboardingCompletedAccountType;
  implementation_type: typeof ONBOARDING_IMPLEMENTATION_TYPE_NATIVE;
  onboarding_type: OnboardingType;
}

export function normalizeOnboardingCompletedAccountType(
  accountType: string,
): OnboardingCompletedAccountType {
  if (accountType === 'imported' || accountType.startsWith('imported_')) {
    return 'imported';
  }

  if (accountType === 'snap') {
    return 'snap';
  }

  if (
    accountType === 'Ledger' ||
    accountType === 'Trezor' ||
    accountType === 'QR Hardware' ||
    accountType === 'Lattice'
  ) {
    return accountType;
  }

  return 'metamask';
}

export function getOnboardingCompletedAnalyticsProps(
  walletSetupCompletedProps: WalletSetupCompletedAnalyticsProps &
    WalletSetupCompletedAttributionAnalyticsPayload,
  isSocialLogin: boolean,
): OnboardingCompletedAnalyticsProps {
  const {
    account_type: accountType,
    ...walletSetupCompletedPropsWithoutAccountType
  } = walletSetupCompletedProps;

  return {
    ...walletSetupCompletedPropsWithoutAccountType,
    account_type: normalizeOnboardingCompletedAccountType(accountType),
    implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
    onboarding_type: isSocialLogin
      ? ONBOARDING_TYPE_SOCIAL_LOGIN
      : ONBOARDING_TYPE_SEED_PHRASE,
  };
}
