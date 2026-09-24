import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

export type VbaOnboardingDestinationId =
  | 'vendorTerms'
  | 'email'
  | 'identityVerification'
  | 'kycPending'
  | 'kycRejected'
  | 'accountProvisioningError'
  | 'error'
  | 'complete';

interface VbaOnboardingModule {
  id: Extract<
    VbaOnboardingDestinationId,
    'vendorTerms' | 'email' | 'identityVerification'
  >;
  isComplete: (snapshot: VbaOnboardingSnapshot) => boolean;
}

/**
 * Product funnel order used by the coordinator to pick the first incomplete
 * module. Modules own their internal screens and report completion back to the
 * coordinator instead of navigating to the next module directly.
 */
export const VBA_ONBOARDING_MODULES: readonly VbaOnboardingModule[] = [
  {
    id: 'vendorTerms',
    isComplete: (snapshot) =>
      snapshot.vendorTermsAcceptedLocally || snapshot.vendorDisclaimersComplete,
  },
  {
    id: 'email',
    isComplete: (snapshot) =>
      snapshot.sessionExists && snapshot.vendorDisclaimersComplete,
  },
  {
    id: 'identityVerification',
    isComplete: (snapshot) =>
      snapshot.kycStatus !== 'none' &&
      snapshot.kycStatus !== 'new' &&
      snapshot.kycStatus !== 'retry',
  },
];

/**
 * Maps controller facts onto the next onboarding module or status destination.
 * AutoRamp provisioning is performed by `hydrateVbaOnboarding`, so it is not a
 * client-owned module.
 *
 * @param snapshot - Facts from hydrate.
 * @returns The next module or status destination.
 */
export const getVbaDestinationForSnapshot = (
  snapshot: VbaOnboardingSnapshot | null | undefined,
): VbaOnboardingDestinationId => {
  if (!snapshot) {
    return 'error';
  }
  if (snapshot.kycStatus === 'rejected') {
    return 'kycRejected';
  }

  for (const moduleDescriptor of VBA_ONBOARDING_MODULES) {
    if (!moduleDescriptor.isComplete(snapshot)) {
      return moduleDescriptor.id;
    }
  }

  if (snapshot.kycStatus === 'pending') {
    return 'kycPending';
  }

  if (snapshot.kycStatus === 'approved') {
    if (snapshot.autorampStatus === 'ready') {
      return 'complete';
    }

    return snapshot.autorampStatus === 'retryable_failure'
      ? 'accountProvisioningError'
      : 'kycPending';
  }

  return 'error';
};

export const createEmptyVbaOnboardingSnapshot = (): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
});
