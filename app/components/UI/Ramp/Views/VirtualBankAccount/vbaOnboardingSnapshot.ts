/**
 * VBA onboarding facts returned by {@link RampsController.hydrateVbaOnboarding}
 * plus the client-local pre-email Terms 1 acceptance.
 */
export type VbaKycStatus =
  | 'none'
  | 'new'
  | 'retry'
  | 'pending'
  | 'approved'
  | 'rejected';

export type VbaAutorampStatus =
  | 'not_ready'
  | 'in_progress'
  | 'ready'
  | 'retryable_failure';

export interface VbaOnboardingSnapshot {
  /** Client-local acceptance of the pre-email MoonPay links. */
  termsOneAccepted: boolean;
  sessionExists: boolean;
  vendorDisclaimersComplete: boolean;
  sessionDisclaimersComplete: boolean;
  kycStatus: VbaKycStatus;
  autorampStatus: VbaAutorampStatus;
}

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  termsOneAccepted: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  kycStatus: 'none',
  autorampStatus: 'not_ready',
};
