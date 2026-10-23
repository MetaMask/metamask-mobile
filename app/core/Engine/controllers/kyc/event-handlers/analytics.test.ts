import type { KycVerificationStatusChangedPayload } from '@metamask/kyc-controller';
import { trackKycVerificationUpdated } from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';
import { handleVerificationStatusChangedForMetrics } from './analytics';

jest.mock(
  '../../../../../components/UI/KYC/utils/kycVerificationAnalytics',
  () => ({ trackKycVerificationUpdated: jest.fn() }),
);

describe('handleVerificationStatusChangedForMetrics', () => {
  it('forwards the controller payload to KYC Verification Updated', () => {
    const payload: KycVerificationStatusChangedPayload = {
      status: 'succeeded',
      previousKycStatus: 'pending',
      kycStatus: 'approved',
      providerFlowStatus: 'submitted',
      vendor: 'iron',
    };

    handleVerificationStatusChangedForMetrics(payload);

    expect(trackKycVerificationUpdated).toHaveBeenCalledWith({
      status: 'succeeded',
      previousKycStatus: 'pending',
      kycStatus: 'approved',
      providerFlowStatus: 'submitted',
      vendor: 'iron',
    });
  });
});
