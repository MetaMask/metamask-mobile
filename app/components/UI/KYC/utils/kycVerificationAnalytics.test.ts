import { getKycAnalyticsStatus } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import {
  buildKycBaseProperties,
  trackKycStatusUpdated,
  trackKycVerificationUpdated,
} from './kycVerificationAnalytics';

jest.mock('@metamask/kyc-controller', () => ({
  getKycAnalyticsStatus: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: { KycController: { state: {} } },
}));

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockGetKycAnalyticsStatus = jest.mocked(getKycAnalyticsStatus);
const mockTrackEvent = jest.mocked(analytics.trackEvent);
const mockGetState = jest.mocked(ReduxService.store.getState);
const mockEngine = Engine as unknown as {
  context: { KycController?: { state: Record<string, unknown> } };
};

const stateWithLocation = (location: string | undefined) =>
  ({
    engine: { backgroundState: { GeolocationController: { location } } },
  }) as never;

const BASE_PROPERTIES = {
  screen_name: 'vba_onboarding',
  entry_point: 'add_funds_bank_account',
  vendor: 'moonpay',
  kyc_provider: 'sumsub',
  region: 'br',
};

describe('kycVerificationAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue(stateWithLocation('BR'));
    mockEngine.context.KycController = {
      state: {
        vendor: 'iron',
        providerFlowStatus: 'not_started',
        sessionStatus: { id: 'session-secret', finalStatus: 'new' },
        email: 'user@example.com',
      },
    };
    mockGetKycAnalyticsStatus.mockReturnValue('new');
  });

  describe('buildKycBaseProperties', () => {
    it('uses the statuses passed by the caller without reading controller state', () => {
      mockEngine.context.KycController = undefined;

      expect(
        buildKycBaseProperties({
          kycStatus: 'approved',
          providerFlowStatus: 'submitted',
        }),
      ).toStrictEqual({
        ...BASE_PROPERTIES,
        kyc_status: 'approved',
        provider_flow_status: 'submitted',
      });
    });

    it('reads the derived KYC status and flow status from controller state', () => {
      expect(buildKycBaseProperties()).toStrictEqual({
        ...BASE_PROPERTIES,
        kyc_status: 'new',
        provider_flow_status: 'not_started',
      });
      expect(mockGetKycAnalyticsStatus).toHaveBeenCalledWith({
        id: 'session-secret',
        finalStatus: 'new',
      });
    });

    it('reports the schema vendor, not the controller vendor', () => {
      expect(buildKycBaseProperties().vendor).toBe('moonpay');
    });

    it.each([
      ['BR-SP', 'br'],
      ['us', 'us'],
    ])('normalizes location %s to region %s', (location, region) => {
      mockGetState.mockReturnValue(stateWithLocation(location));

      expect(buildKycBaseProperties().region).toBe(region);
    });

    it.each([[undefined], ['UNKNOWN'], ['XX']])(
      'reports an unknown region for location %s',
      (location) => {
        mockGetState.mockReturnValue(stateWithLocation(location));

        expect(buildKycBaseProperties().region).toBe('unknown');
      },
    );

    it('reports an unknown region when the store is unavailable', () => {
      mockGetState.mockImplementation(() => {
        throw new Error('no store');
      });

      expect(buildKycBaseProperties().region).toBe('unknown');
    });

    it('uses the screen name the caller passes', () => {
      expect(
        buildKycBaseProperties({ screenName: 'other_funnel' }),
      ).toMatchObject({ screen_name: 'other_funnel' });
    });

    it('uses the schema defaults when the controller state is missing', () => {
      mockEngine.context.KycController = undefined;

      expect(buildKycBaseProperties()).toStrictEqual({
        ...BASE_PROPERTIES,
        kyc_status: 'none',
        provider_flow_status: 'not_started',
      });
    });

    it('never includes session or personal data', () => {
      const properties = buildKycBaseProperties();

      expect(JSON.stringify(properties)).not.toContain('session-secret');
      expect(JSON.stringify(properties)).not.toContain('user@example.com');
    });
  });

  describe('trackKycVerificationUpdated', () => {
    it('tracks KYC Verification Updated with the status and base properties', () => {
      trackKycVerificationUpdated({ status: 'started' });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const event = mockTrackEvent.mock.calls[0][0];
      expect(event.name).toBe('KYC Verification Updated');
      expect(event.properties).toStrictEqual({
        ...BASE_PROPERTIES,
        kyc_status: 'new',
        provider_flow_status: 'not_started',
        status: 'started',
      });
    });

    it('adds retry_source for retries and never sends previous_kyc_status', () => {
      trackKycVerificationUpdated({
        status: 'retry_started',
        retrySource: 'kyc_rejected',
      });

      const { properties } = mockTrackEvent.mock.calls[0][0];
      expect(properties).toMatchObject({
        status: 'retry_started',
        retry_source: 'kyc_rejected',
      });
      expect(properties).not.toHaveProperty('previous_kyc_status');
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

    it('logs instead of throwing when building the properties fails', () => {
      const error = new Error('controller exploded');
      mockGetKycAnalyticsStatus.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        trackKycVerificationUpdated({ status: 'started' }),
      ).not.toThrow();
      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: { feature: 'vba-kyc', event: 'KYC Verification Updated' },
      });
    });
  });

  describe('trackKycStatusUpdated', () => {
    it('tracks KYC Status Updated with the new and previous status', () => {
      trackKycStatusUpdated({
        previousKycStatus: 'pending',
        kycStatus: 'approved',
        providerFlowStatus: 'submitted',
      });

      const event = mockTrackEvent.mock.calls[0][0];
      expect(event.name).toBe('KYC Status Updated');
      expect(event.properties).toStrictEqual({
        ...BASE_PROPERTIES,
        kyc_status: 'approved',
        provider_flow_status: 'submitted',
        previous_kyc_status: 'pending',
      });
    });

    it('sends previous_kyc_status none the first time a status is stored', () => {
      trackKycStatusUpdated({
        previousKycStatus: 'none',
        kycStatus: 'new',
        providerFlowStatus: 'not_started',
      });

      expect(mockTrackEvent.mock.calls[0][0].properties).toMatchObject({
        previous_kyc_status: 'none',
      });
    });

    it('logs instead of throwing when tracking fails', () => {
      mockTrackEvent.mockImplementationOnce(() => {
        throw new Error('tracking failed');
      });

      expect(() =>
        trackKycStatusUpdated({ previousKycStatus: 'none', kycStatus: 'new' }),
      ).not.toThrow();
      expect(Logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
