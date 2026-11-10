import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';

/**
 * Account facts from `RampsController` hydrate. VBA reads `autorampStatus`
 * from it; the KYC step comes from kyc-api through `KycController`.
 */
export type VbaOnboardingSnapshot = RampsVbaOnboardingSnapshot;

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
