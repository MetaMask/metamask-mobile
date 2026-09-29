import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../constants/onboarding';
import type { JsonMap } from './analytics.types';

export const ONBOARDING_IMPLEMENTATION_TYPE_NATIVE = 'native' as const;

export const ONBOARDING_TYPE_SEED_PHRASE = 'seed_phrase' as const;
export const ONBOARDING_TYPE_SOCIAL_LOGIN = 'social_login' as const;

export type OnboardingType =
  | typeof ONBOARDING_TYPE_SEED_PHRASE
  | typeof ONBOARDING_TYPE_SOCIAL_LOGIN;

export enum OnboardingCompletedAccountType {
  Metamask = 'metamask',
  Imported = 'imported',
  Snap = 'snap',
  Ledger = 'Ledger',
  Trezor = 'Trezor',
  QrHardware = 'QR Hardware',
  Lattice = 'Lattice',
}

export interface WalletSetupCompletedProps extends JsonMap {
  wallet_setup_type: string;
  new_wallet: boolean;
  account_type?: AccountType | string;
  is_basic_functionality_enabled?: boolean;
}

export interface OnboardingCompletedAnalyticsProps
  extends Omit<WalletSetupCompletedProps, 'account_type'> {
  account_type?: OnboardingCompletedAccountType;
  implementation_type: typeof ONBOARDING_IMPLEMENTATION_TYPE_NATIVE;
  onboarding_type: OnboardingType;
}

const SOCIAL_ACCOUNT_TYPE_PREFIXES = ['metamask_', 'imported_'] as const;

export function normalizeOnboardingCompletedAccountType(
  accountType: string | undefined,
): OnboardingCompletedAccountType | undefined {
  if (!accountType) {
    return undefined;
  }

  if (
    SOCIAL_ACCOUNT_TYPE_PREFIXES.some((prefix) =>
      accountType.startsWith(prefix),
    )
  ) {
    return accountType.startsWith('imported_')
      ? OnboardingCompletedAccountType.Imported
      : OnboardingCompletedAccountType.Metamask;
  }

  const schemaAccountTypeValues = Object.values(
    OnboardingCompletedAccountType,
  ) as string[];

  if (schemaAccountTypeValues.includes(accountType)) {
    return accountType as OnboardingCompletedAccountType;
  }

  return undefined;
}

export function getWalletSetupPropsFromSuccessFlow(
  successFlow: ONBOARDING_SUCCESS_FLOW,
): Pick<WalletSetupCompletedProps, 'wallet_setup_type' | 'new_wallet'> & {
  isSocialLogin: boolean;
} {
  switch (successFlow) {
    case ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE:
      return {
        wallet_setup_type: 'import',
        new_wallet: false,
        isSocialLogin: false,
      };
    case ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING:
      return {
        wallet_setup_type: 'new',
        new_wallet: true,
        isSocialLogin: true,
      };
    default:
      return {
        wallet_setup_type: 'new',
        new_wallet: true,
        isSocialLogin: false,
      };
  }
}

export function getOnboardingCompletedAnalyticsProps(
  walletSetupCompletedProps: WalletSetupCompletedProps,
  isSocialLogin: boolean,
): OnboardingCompletedAnalyticsProps {
  const { account_type: accountType, ...rest } = walletSetupCompletedProps;

  return {
    ...rest,
    ...(accountType
      ? {
          account_type: normalizeOnboardingCompletedAccountType(accountType),
        }
      : {}),
    implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
    onboarding_type: isSocialLogin
      ? ONBOARDING_TYPE_SOCIAL_LOGIN
      : ONBOARDING_TYPE_SEED_PHRASE,
  };
}

export function getOnboardingCompletedAnalyticsPropsFromSuccessFlow(
  successFlow: ONBOARDING_SUCCESS_FLOW,
  options: {
    accountType?: AccountType | string;
    isBasicFunctionalityEnabled: boolean;
  },
): OnboardingCompletedAnalyticsProps {
  const walletSetupProps = getWalletSetupPropsFromSuccessFlow(successFlow);

  return getOnboardingCompletedAnalyticsProps(
    {
      wallet_setup_type: walletSetupProps.wallet_setup_type,
      new_wallet: walletSetupProps.new_wallet,
      account_type: options.accountType,
      is_basic_functionality_enabled: options.isBasicFunctionalityEnabled,
    },
    walletSetupProps.isSocialLogin,
  );
}
