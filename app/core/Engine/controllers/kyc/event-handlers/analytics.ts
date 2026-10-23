import type { KycVerificationStatusChangedPayload } from '@metamask/kyc-controller';
import { trackKycVerificationUpdated } from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';

/**
 * Maps `KycController:verificationStatusChanged` to `KYC Verification Updated`.
 *
 * The controller publishes after its state write and only for a SumSub launch
 * outcome or a newly approved or rejected session, so every payload is sent.
 *
 * @param payload - The event payload.
 */
export function handleVerificationStatusChangedForMetrics(
  payload: KycVerificationStatusChangedPayload,
): void {
  trackKycVerificationUpdated({
    status: payload.status,
    previousKycStatus: payload.previousKycStatus,
    kycStatus: payload.kycStatus,
    providerFlowStatus: payload.providerFlowStatus,
    vendor: payload.vendor,
  });
}
