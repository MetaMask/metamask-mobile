import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';

/**
 * {@link RampsVbaOnboardingSnapshot} plus client-local vendor terms.
 */
export type VbaOnboardingSnapshot = RampsVbaOnboardingSnapshot & {
  vendorTermsAcceptedLocally: boolean;
  /**
   * Whether idOS has finalized the session. Set by ramps-controller once that
   * package reports it. Older controllers omit the field, which stays open.
   */
  sessionClosed: boolean;
};

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  vendorTermsAcceptedLocally: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  sessionClosed: false,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
