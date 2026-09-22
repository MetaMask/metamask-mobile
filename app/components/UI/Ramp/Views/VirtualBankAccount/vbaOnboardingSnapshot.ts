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

export type VbaOnboardingActivation =
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
  finalStatus: VbaKycStatus;
  activation: VbaOnboardingActivation;
}

export const EMPTY_VBA_ONBOARDING_SNAPSHOT: VbaOnboardingSnapshot = {
  termsOneAccepted: false,
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  kycStatus: 'none',
  finalStatus: 'none',
  activation: 'not_ready',
};

export const mergeVbaOnboardingSnapshot = (
  base: VbaOnboardingSnapshot,
  patch: Partial<VbaOnboardingSnapshot>,
): VbaOnboardingSnapshot => ({ ...base, ...patch });
