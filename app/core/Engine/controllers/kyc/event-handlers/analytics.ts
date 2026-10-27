import type {
  KycAnalyticsStatusChangedPayload,
  KycAnalyticsVerificationOutcomePayload,
} from '@metamask/kyc-controller';
import {
  trackKycStatusUpdated,
  trackKycVerificationUpdated,
} from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';

/**
 * Maps a SumSub launch outcome from `trackKycAnalytics.verificationOutcome`
 * to `KYC Verification Updated`. The controller calls it once per attempt.
 *
 * @param payload - The launch outcome.
 */
export function handleVerificationStatusChangedForMetrics(
  payload: KycAnalyticsVerificationOutcomePayload,
): void {
  trackKycVerificationUpdated({
    status: payload.status,
    kycStatus: payload.kycStatus,
    providerFlowStatus: payload.providerFlowStatus,
  });
}

/**
 * Maps a `trackKycAnalytics.statusChanged` call to `KYC Status Updated`. The
 * controller calls it after a write that changes the analytics KYC status, and
 * not when an already-decided session is loaded into empty state.
 *
 * @param payload - The status change.
 */
export function handleKycStatusChangedForMetrics(
  payload: KycAnalyticsStatusChangedPayload,
): void {
  trackKycStatusUpdated({
    previousKycStatus: payload.previousKycStatus,
    kycStatus: payload.kycStatus,
    providerFlowStatus: payload.providerFlowStatus,
  });
}
