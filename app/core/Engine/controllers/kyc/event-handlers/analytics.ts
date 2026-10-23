import type {
  KycStatusChangedPayload,
  KycVerificationStatusChangedPayload,
} from '@metamask/kyc-controller';
import {
  trackKycStatusUpdated,
  trackKycVerificationUpdated,
} from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';

/**
 * Maps `KycController:verificationStatusChanged` to `KYC Verification Updated`.
 * The controller publishes it once per SumSub launch attempt.
 *
 * @param payload - The event payload.
 */
export function handleVerificationStatusChangedForMetrics(
  payload: KycVerificationStatusChangedPayload,
): void {
  trackKycVerificationUpdated({
    status: payload.status,
    kycStatus: payload.kycStatus,
    providerFlowStatus: payload.providerFlowStatus,
  });
}

/**
 * Maps `KycController:kycStatusChanged` to `KYC Status Updated`. The controller
 * publishes it after a write that changes the derived KYC status, and not when
 * an already-decided session is loaded into empty state.
 *
 * @param payload - The event payload.
 */
export function handleKycStatusChangedForMetrics(
  payload: KycStatusChangedPayload,
): void {
  trackKycStatusUpdated({
    previousKycStatus: payload.previousKycStatus,
    kycStatus: payload.kycStatus,
    providerFlowStatus: payload.providerFlowStatus,
  });
}
