import type { VbaOnboardingSnapshot } from './vbaOnboardingSnapshot';

export const VbaOnboardingRoutes = {
  VENDOR_TERMS: 'VbaVendorTerms',
  EMAIL: 'VbaEmail',
  IDENTITY_VERIFICATION: 'VbaIdentityVerification',
  KYC_PENDING: 'VbaKycPending',
  KYC_REJECTED: 'VbaKycRejected',
  ACCOUNT_PROVISIONING_ERROR: 'VbaAccountProvisioningError',
  ERROR: 'VbaError',
  DETAILS: 'VbaDetails',
} as const;

// React Navigation param lists must remain type aliases for strict route keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VbaOnboardingParamList = {
  VbaVendorTerms: undefined;
  VbaEmail: undefined;
  VbaIdentityVerification: {
    snapshot: VbaOnboardingSnapshot;
  };
  VbaKycPending: undefined;
  VbaKycRejected: undefined;
  VbaAccountProvisioningError: undefined;
  VbaError: undefined;
  VbaDetails: undefined;
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
  VbaIdentityVerificationProvider: {
    initialNeedsMoreInfo: boolean;
  };
};
