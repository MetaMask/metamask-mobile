import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';

/**
 * {@link RampsVbaOnboardingSnapshot} plus client-local pre-email vendor terms.
 */
export type VbaOnboardingSnapshot = RampsVbaOnboardingSnapshot & {
  vendorTermsAcceptedLocally: boolean;
};

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  vendorTermsAcceptedLocally: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
