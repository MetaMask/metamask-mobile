import type {
  KycAnalyticsStatusChangedPayload,
  KycAnalyticsVerificationOutcomePayload,
} from '@metamask/kyc-controller';
import {
  trackKycStatusUpdated,
  trackKycVerificationUpdated,
} from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';

/**
 * Maps `KycController:analyticsVerificationOutcome` to `KYC Verification Updated`.
 * The controller publishes it once per SumSub launch attempt.
 *
 * @param payload - The event payload.
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
 * Maps `KycController:analyticsStatusChanged` to `KYC Status Updated`. The controller
 * publishes it after a write that changes the derived KYC status, and not when
 * an already-decided session is loaded into empty state.
 *
 * @param payload - The event payload.
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
