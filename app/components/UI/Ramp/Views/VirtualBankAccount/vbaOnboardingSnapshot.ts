import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';

/**
 * {@link RampsVbaOnboardingSnapshot} plus client-local pre-email Terms 1.
 */
export type VbaOnboardingSnapshot = RampsVbaOnboardingSnapshot & {
  termsOneAccepted: boolean;
};

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  termsOneAccepted: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
