import type {
  AccountCreateErrorVariant,
  AccountCreateFailureFields,
} from './accountCreateError';
import type { VbaOnboardingSnapshot } from './vbaOnboardingSnapshot';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';

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
