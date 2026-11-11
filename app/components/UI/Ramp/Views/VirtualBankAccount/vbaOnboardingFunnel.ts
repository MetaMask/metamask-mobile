import type { AccountCreateErrorDestinationId } from './accountCreateError';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

export type VbaOnboardingDestinationId =
  | 'vendorTerms'
  | 'email'
  | 'identityVerification'
  | 'identityVerified'
  | 'kycPending'
  | 'kycRejected'
  | 'accountProvisioningError'
  | AccountCreateErrorDestinationId
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
    isComplete: (snapshot) => snapshot.sessionExists,
  },
  {
    id: 'identityVerification',
    isComplete: (snapshot) =>
      snapshot.sessionDisclaimersComplete &&
      snapshot.kycStatus !== 'retry' &&
      (snapshot.kycStatus === 'approved' ||
        snapshot.providerFlowStatus === 'submitted'),
  },
];

/**
 * Maps controller facts onto the next onboarding module or status destination.
 * This read does not sign or create an account. A usable autoramp opens the
 * account screen even when reinstall wiped local terms and the KYC session.
 * Approved KYC without one opens Identity verified. Account setup runs later,
 * on that account screen.
 *
 * A rejected applicant opens the failure screen. Rejection is terminal, so
 * that screen contacts support instead of requesting another SumSub token.
 * An applicant UKYC asked to retry before the provider flow was (re)submitted
 * opens the same screen, and Try again relaunches Sumsub. Routing that retry
 * straight into identity verification from every entry point dropped the user
 * back into the provider, so closing Sumsub looked like it had done nothing.
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
  if (
    snapshot.kycStatus === 'rejected' ||
    (snapshot.kycStatus === 'retry' &&
      snapshot.providerFlowStatus !== 'submitted')
  ) {
    return 'kycRejected';
  }

  // Reinstall drops local vendor terms and the persisted KYC session.
  // Hydrate can still report a usable autoramp once that session is
  // reattached. Those incomplete modules must not send an existing account
  // back through creation, which then waits on a session that already exists.
  if (snapshot.autorampStatus === 'ready') {
    return 'complete';
  }

  for (const moduleDescriptor of VBA_ONBOARDING_MODULES) {
    if (!moduleDescriptor.isComplete(snapshot)) {
      return moduleDescriptor.id;
    }
  }

  if (snapshot.kycStatus === 'approved') {
    return 'identityVerified';
  }

  if (
    snapshot.kycStatus === 'pending' ||
    (snapshot.providerFlowStatus === 'submitted' &&
      snapshot.kycStatus !== 'retry')
  ) {
    return 'kycPending';
  }

  return 'error';
};

export const createEmptyVbaOnboardingSnapshot = (): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
});
