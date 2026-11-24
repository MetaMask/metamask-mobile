import ReduxService from '../../../../../core/redux';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  buildVbaBaseProperties,
  recordVbaOnboardingSnapshot,
  resetVbaOnboardingSnapshotForAnalytics,
  trackVbaEvent,
} from './vbaAnalytics';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from './vbaOnboardingSnapshot';

jest.mock('../../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));
jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockGetState = jest.mocked(ReduxService.store.getState);

const stateWithLocation = (location: string | undefined) =>
  ({
    engine: {
      backgroundState: { GeolocationController: { location } },
    },
  }) as never;

describe('vbaAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVbaOnboardingSnapshotForAnalytics();
    mockGetState.mockReturnValue(stateWithLocation('BR'));
  });

  describe('buildVbaBaseProperties', () => {
    it('reports the empty onboarding state before any hydrate', () => {
      expect(buildVbaBaseProperties()).toStrictEqual({
        entry_point: 'add_funds_bank_account',
        vendor: 'moonpay',
        kyc_status: 'none',
        autoramp_status: 'not_ready',
        provider_flow_status: 'not_started',
        region: 'br',
      });
    });

    it('uses the latest recorded snapshot', () => {
      recordVbaOnboardingSnapshot({
        ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
        kycStatus: 'approved',
        autorampStatus: 'ready',
        providerFlowStatus: 'submitted',
      });

      expect(buildVbaBaseProperties()).toMatchObject({
        kyc_status: 'approved',
        autoramp_status: 'ready',
        provider_flow_status: 'submitted',
      });
    });

    it('adds the optional values the caller provides', () => {
      expect(
        buildVbaBaseProperties({
          screenName: 'vba_details',
          kycStatus: 'pending',
          currencySource: 'BRL',
          failureReason: 'vba_create_failed',
        }),
      ).toMatchObject({
        screen_name: 'vba_details',
        kyc_status: 'pending',
        currency_source: 'BRL',
        failure_reason: 'vba_create_failed',
      });
    });

    it.each([
      ['BR-SP', 'br'],
      ['us', 'us'],
    ])('normalizes location %s to region %s', (location, region) => {
      mockGetState.mockReturnValue(stateWithLocation(location));

      expect(buildVbaBaseProperties().region).toBe(region);
    });

    it.each([[undefined], ['UNKNOWN'], ['XX']])(
      'reports an unknown region for location %s',
      (location) => {
        mockGetState.mockReturnValue(stateWithLocation(location));

        expect(buildVbaBaseProperties().region).toBe('unknown');
      },
    );

    it('reports an unknown region when the store is unavailable', () => {
      mockGetState.mockImplementation(() => {
        throw new Error('no store');
      });

      expect(buildVbaBaseProperties().region).toBe('unknown');
    });
  });

  describe('trackVbaEvent', () => {
    it('tracks the event with its properties', () => {
      trackVbaEvent(MetaMetricsEvents.MONEY_VBA_DETAILS_VIEWED, () => ({
        screen_name: 'vba_details',
      }));

      const event = jest.mocked(analytics.trackEvent).mock.calls[0][0];
      expect(event.name).toBe('Money VBA Details Viewed');
      expect(event.properties).toStrictEqual({ screen_name: 'vba_details' });
    });

    it('logs instead of throwing when tracking fails', () => {
      const error = new Error('tracking failed');
      jest.mocked(analytics.trackEvent).mockImplementationOnce(() => {
        throw error;
      });

      expect(() =>
        trackVbaEvent(MetaMetricsEvents.MONEY_VBA_DETAILS_VIEWED, () => ({})),
      ).not.toThrow();
      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: { feature: 'vba-onboarding', event: 'Money VBA Details Viewed' },
      });
    });

    it('logs instead of throwing when building the properties fails', () => {
      const error = new Error('properties failed');

      expect(() =>
        trackVbaEvent(MetaMetricsEvents.MONEY_VBA_DETAILS_VIEWED, () => {
          throw error;
        }),
      ).not.toThrow();
      expect(jest.mocked(analytics.trackEvent)).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: { feature: 'vba-onboarding', event: 'Money VBA Details Viewed' },
      });
    });
  });
});
