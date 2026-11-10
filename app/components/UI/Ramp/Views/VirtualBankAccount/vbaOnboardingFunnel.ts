import type { KycStep } from '@metamask/kyc-controller';
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

/**
 * VBA's screen for each KYC step kyc-api returns. kyc-api decides the step:
 * the order, the retry and rejection rules, and what survives a reinstall.
 * Retry and rejection share the failure screen; its action follows the step.
 */
const VBA_DESTINATION_FOR_KYC_STEP: Record<
  KycStep,
  VbaOnboardingDestinationId
> = {
  vendor_terms: 'vendorTerms',
  verify_email: 'email',
  identity_verification: 'identityVerification',
  kyc_pending: 'kycPending',
  kyc_retry: 'kycRejected',
  kyc_rejected: 'kycRejected',
  approved: 'identityVerified',
  error: 'error',
};

/**
 * Picks VBA's next screen. A usable autoramp opens the account first: only
 * VBA knows the account is already provisioned, and a reinstall must not send
 * an existing account back through creation. Otherwise the KYC step from
 * kyc-api decides.
 *
 * @param step - The step kyc-api returned for `iron`, or `null` when unknown.
 * @param snapshot - Account facts from hydrate. Only `autorampStatus` is read.
 * @returns The next destination.
 */
export const getVbaDestinationForStep = (
  step: KycStep | null | undefined,
  snapshot: Pick<VbaOnboardingSnapshot, 'autorampStatus'> | null | undefined,
): VbaOnboardingDestinationId => {
  if (snapshot?.autorampStatus === 'ready') {
    return 'complete';
  }
  if (!step) {
    return 'error';
  }
  return VBA_DESTINATION_FOR_KYC_STEP[step];
};

export const createEmptyVbaOnboardingSnapshot = (): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
});
