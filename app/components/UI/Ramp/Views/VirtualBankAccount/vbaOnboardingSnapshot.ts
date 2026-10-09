import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';

/**
 * Autoramp progress from the read-only hydrate, including statuses added after
 * the published controller type.
 */
export type VbaAutorampStatus =
  | RampsVbaOnboardingSnapshot['autorampStatus']
  | 'needs_wallet_registration'
  | 'needs_source_currency';

/**
 * {@link RampsVbaOnboardingSnapshot} plus client-local vendor terms.
 */
export type VbaOnboardingSnapshot = Omit<
  RampsVbaOnboardingSnapshot,
  'autorampStatus'
> & {
  vendorTermsAcceptedLocally: boolean;
  autorampStatus: VbaAutorampStatus;
};

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  vendorTermsAcceptedLocally: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
