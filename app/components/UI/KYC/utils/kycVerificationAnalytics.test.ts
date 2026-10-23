import { deriveKycStatus } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import {
  buildKycVerificationUpdatedProperties,
  trackKycVerificationUpdated,
} from './kycVerificationAnalytics';

jest.mock('@metamask/kyc-controller', () => ({
  deriveKycStatus: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: { KycController: { state: {} } },
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockDeriveKycStatus = jest.mocked(deriveKycStatus);
const mockTrackEvent = jest.mocked(analytics.trackEvent);
const mockEngine = Engine as unknown as {
  context: { KycController?: { state: Record<string, unknown> } };
};

const BASE_PROPERTIES = {
  screen_name: 'vba_onboarding',
  entry_point: 'add_funds_bank_account',
  kyc_provider: 'sumsub',
};

describe('kycVerificationAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.context.KycController = {
      state: {
        vendor: 'iron',
        providerFlowStatus: 'not_started',
        sessionStatus: { id: 'session-secret', finalStatus: 'new' },
        email: 'user@example.com',
      },
    };
    mockDeriveKycStatus.mockReturnValue('new');
  });

  describe('buildKycVerificationUpdatedProperties', () => {
    it('uses the values passed by the caller without reading controller state', () => {
      mockEngine.context.KycController = undefined;

      expect(
        buildKycVerificationUpdatedProperties({
          status: 'succeeded',
          previousKycStatus: 'pending',
          kycStatus: 'approved',
          providerFlowStatus: 'submitted',
          vendor: 'iron',
        }),
      ).toStrictEqual({
        ...BASE_PROPERTIES,
        status: 'succeeded',
        vendor: 'iron',
        kyc_status: 'approved',
        provider_flow_status: 'submitted',
        previous_kyc_status: 'pending',
      });
    });

    it('reads the derived KYC status, flow status and vendor from controller state', () => {
      expect(
        buildKycVerificationUpdatedProperties({ status: 'started' }),
      ).toStrictEqual({
        ...BASE_PROPERTIES,
        status: 'started',
        vendor: 'iron',
        kyc_status: 'new',
        provider_flow_status: 'not_started',
      });
      expect(mockDeriveKycStatus).toHaveBeenCalledWith(
        { id: 'session-secret', finalStatus: 'new' },
        'not_started',
      );
    });

    it('adds retry_source for retries and omits previous_kyc_status', () => {
      expect(
        buildKycVerificationUpdatedProperties({
          status: 'retry_started',
          retrySource: 'kyc_rejected',
        }),
      ).toStrictEqual({
        ...BASE_PROPERTIES,
        status: 'retry_started',
        retry_source: 'kyc_rejected',
        vendor: 'iron',
        kyc_status: 'new',
        provider_flow_status: 'not_started',
      });
    });

    it('omits vendor and statuses that are unknown', () => {
      mockEngine.context.KycController = undefined;

      expect(
        buildKycVerificationUpdatedProperties({ status: 'started' }),
      ).toStrictEqual({ ...BASE_PROPERTIES, status: 'started' });
    });

    it('omits a null vendor passed by the caller', () => {
      expect(
        buildKycVerificationUpdatedProperties({
          status: 'abandoned',
          kycStatus: 'new',
          providerFlowStatus: 'abandoned',
          vendor: null,
        }),
      ).not.toHaveProperty('vendor');
    });

    it('never includes session or personal data', () => {
      const properties = buildKycVerificationUpdatedProperties({
        status: 'started',
      });

      expect(JSON.stringify(properties)).not.toContain('session-secret');
      expect(JSON.stringify(properties)).not.toContain('user@example.com');
    });
  });

  describe('trackKycVerificationUpdated', () => {
    it('tracks KYC Verification Updated with the built properties', () => {
      trackKycVerificationUpdated({ status: 'started' });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const event = mockTrackEvent.mock.calls[0][0];
      expect(event.name).toBe('KYC Verification Updated');
      expect(event.properties).toStrictEqual({
        ...BASE_PROPERTIES,
        status: 'started',
        vendor: 'iron',
        kyc_status: 'new',
        provider_flow_status: 'not_started',
      });
    });

    it('logs instead of throwing when tracking fails', () => {
      const error = new Error('tracking failed');
      mockTrackEvent.mockImplementationOnce(() => {
        throw error;
      });

      expect(() =>
        trackKycVerificationUpdated({ status: 'started' }),
      ).not.toThrow();
      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: { feature: 'vba-kyc', event: 'KYC Verification Updated' },
      });
    });
  });
});
