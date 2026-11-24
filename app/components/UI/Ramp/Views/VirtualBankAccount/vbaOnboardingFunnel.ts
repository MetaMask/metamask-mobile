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
    // Server-side pending survives reinstall even when the local provider-flow
    // marker does not, so it must not reopen SumSub.
    isComplete: (snapshot) =>
      snapshot.sessionDisclaimersComplete &&
      snapshot.kycStatus !== 'retry' &&
      (snapshot.kycStatus === 'approved' ||
        (snapshot.kycStatus === 'pending' &&
          snapshot.providerFlowStatus === 'not_started') ||
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
 * An applicant UKYC asked to retry opens the same screen, whether or not the
 * provider flow was already submitted, and Try again relaunches Sumsub. The
 * provider flow stays `submitted` after the first upload, so a retry decided
 * after it (for example a rejected proof of address) must not skip this
 * screen. Routing it straight into identity verification reopened the upload
 * with no reason and no way out, and every rejected upload repeated that loop.
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

  if (snapshot.kycStatus === 'rejected' || snapshot.kycStatus === 'retry') {
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
    snapshot.providerFlowStatus === 'submitted'
  ) {
    return 'kycPending';
  }

  return 'error';
};

export const createEmptyVbaOnboardingSnapshot = (): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
});
