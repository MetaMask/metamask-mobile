import {
  trackKycStatusUpdated,
  trackKycVerificationUpdated,
} from '../../../../../components/UI/KYC/utils/kycVerificationAnalytics';
import {
  handleKycStatusChangedForMetrics,
  handleVerificationStatusChangedForMetrics,
} from './analytics';

jest.mock(
  '../../../../../components/UI/KYC/utils/kycVerificationAnalytics',
  () => ({
    trackKycVerificationUpdated: jest.fn(),
    trackKycStatusUpdated: jest.fn(),
  }),
);

describe('KYC analytics event handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a launch outcome to KYC Verification Updated', () => {
    handleVerificationStatusChangedForMetrics({
      status: 'submitted',
      kycStatus: 'pending',
      providerFlowStatus: 'submitted',
      vendor: 'iron',
    });

    expect(trackKycVerificationUpdated).toHaveBeenCalledWith({
      status: 'submitted',
      kycStatus: 'pending',
      providerFlowStatus: 'submitted',
    });
    expect(trackKycStatusUpdated).not.toHaveBeenCalled();
  });

  it('maps a status change to KYC Status Updated', () => {
    handleKycStatusChangedForMetrics({
      previousKycStatus: 'pending',
      kycStatus: 'approved',
      providerFlowStatus: 'submitted',
      vendor: 'iron',
    });

    expect(trackKycStatusUpdated).toHaveBeenCalledWith({
      previousKycStatus: 'pending',
      kycStatus: 'approved',
      providerFlowStatus: 'submitted',
    });
    expect(trackKycVerificationUpdated).not.toHaveBeenCalled();
  });

  it('passes the none previous status through for a first status', () => {
    handleKycStatusChangedForMetrics({
      previousKycStatus: 'none',
      kycStatus: 'new',
      providerFlowStatus: 'not_started',
      vendor: 'iron',
    });

    expect(trackKycStatusUpdated).toHaveBeenCalledWith({
      previousKycStatus: 'none',
      kycStatus: 'new',
      providerFlowStatus: 'not_started',
    });
  });
});
