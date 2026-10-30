import type {
  AccountCreateErrorVariant,
  AccountCreateFailureFields,
} from './accountCreateError';
import type { VbaOnboardingSnapshot } from './vbaOnboardingSnapshot';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';
import Routes from '../../../../../constants/navigation/Routes';
import type { NavigationBranchState } from '../../../../../core/DeeplinkManager/utils/resetToHomeNav';

export const VbaOnboardingRoutes = {
  VENDOR_TERMS: 'VbaVendorTerms',
  LOADING: 'VbaOnboardingLoading',
  EMAIL: 'VbaEmail',
  IDENTITY_VERIFICATION: 'VbaIdentityVerification',
  KYC_PENDING: 'VbaKycPending',
  IDENTITY_VERIFIED: 'VbaIdentityVerified',
  CHOOSE_CURRENCY: 'VbaChooseCurrency',
  KYC_REJECTED: 'VbaKycRejected',
  ACCOUNT_PROVISIONING_ERROR: 'VbaAccountProvisioningError',
  ACCOUNT_CREATE_ERROR: 'VbaAccountCreateError',
  ERROR: 'VbaError',
} as const;

// React Navigation param lists must remain type aliases for strict route keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VbaOnboardingParamList = {
  VbaVendorTerms: undefined;
  VbaOnboardingLoading: { source?: string } | undefined;
  VbaEmail: undefined;
  VbaIdentityVerification: {
    snapshot: VbaOnboardingSnapshot;
  };
  VbaKycPending: undefined;
  VbaIdentityVerified: undefined;
  VbaChooseCurrency: undefined;
  VbaKycRejected: undefined;
  VbaAccountProvisioningError: undefined;
  VbaAccountCreateError: {
    variant: AccountCreateErrorVariant;
    failure?: AccountCreateFailureFields;
    sourceCurrency?: VbaSourceCurrency;
    retryable?: boolean;
  };
  VbaError: undefined;
};

/** Money home, where onboarding starts and where back returns to. */
export const VBA_DEFAULT_CALLER_ROUTE = {
  name: Routes.HOME_TABS,
  params: {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  },
};

/**
 * Main stack state that opens onboarding on its loading screen above Money
 * home, the same two-route shape `openAsOnlyOnboardingRoute` keeps.
 */
export const getVbaOnboardingResumeState = (
  source: string,
): NavigationBranchState => ({
  index: 1,
  routes: [
    VBA_DEFAULT_CALLER_ROUTE,
    {
      name: Routes.RAMP.VBA_ONBOARDING,
      state: {
        index: 0,
        routes: [{ name: VbaOnboardingRoutes.LOADING, params: { source } }],
      },
    },
  ],
});

export const VbaIdentityVerificationRoutes = {
  PROVIDER_TERMS: 'VbaIdentityVerificationProviderTerms',
  PROVIDER: 'VbaIdentityVerificationProvider',
} as const;

export type VbaIdentityVerificationRoute =
  (typeof VbaIdentityVerificationRoutes)[keyof typeof VbaIdentityVerificationRoutes];

// React Navigation param lists must remain type aliases for strict route keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VbaIdentityVerificationParamList = {
  VbaIdentityVerificationProviderTerms: undefined;
  VbaIdentityVerificationProvider: undefined;
};
