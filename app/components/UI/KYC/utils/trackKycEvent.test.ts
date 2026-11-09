import { MetaMetricsEvents } from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import { trackKycEvent } from './trackKycEvent';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockTrackEvent = jest.mocked(analytics.trackEvent);

const RESULT_VIEWED_PROPERTIES = {
  screen_name: 'vba_onboarding',
  entry_point: 'add_funds_bank_account',
  vendor: 'moonpay',
  kyc_provider: 'sumsub',
  kyc_status: 'approved',
  provider_flow_status: 'not_started',
  region: 'br',
};

describe('trackKycEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the properties the caller built, unchanged', () => {
    trackKycEvent(
      MetaMetricsEvents.KYC_RESULT_VIEWED,
      () => RESULT_VIEWED_PROPERTIES,
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const event = mockTrackEvent.mock.calls[0][0];
    expect(event.name).toBe('KYC Result Viewed');
    expect(event.properties).toStrictEqual(RESULT_VIEWED_PROPERTIES);
  });

  it('sends identity-terms properties unchanged', () => {
    const properties = {
      ...RESULT_VIEWED_PROPERTIES,
      kyc_status: 'none',
      status: 'page1_viewed',
    };

    trackKycEvent(
      MetaMetricsEvents.KYC_IDENTITY_TERMS_UPDATED,
      () => properties,
    );

    expect(mockTrackEvent.mock.calls[0][0].properties).toStrictEqual(
      properties,
    );
  });

  it('logs instead of throwing when tracking fails', () => {
    const error = new Error('tracking failed');
    mockTrackEvent.mockImplementationOnce(() => {
      throw error;
    });

    expect(() =>
      trackKycEvent(MetaMetricsEvents.KYC_RESULT_VIEWED, () => ({})),
    ).not.toThrow();
    expect(Logger.error).toHaveBeenCalledWith(error, {
      tags: { feature: 'vba-kyc', event: 'KYC Result Viewed' },
    });
  });

  it('logs instead of throwing when building the properties fails', () => {
    const error = new Error('properties failed');

    expect(() =>
      trackKycEvent(MetaMetricsEvents.KYC_RESULT_VIEWED, () => {
        throw error;
      }),
    ).not.toThrow();
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(error, {
      tags: { feature: 'vba-kyc', event: 'KYC Result Viewed' },
    });
  });
});
