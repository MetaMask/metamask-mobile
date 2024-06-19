import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';

jest.mock('../../../../core/Analytics', () => ({
  ...jest.requireActual('../../../../core/Analytics'),
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      trackEvent: jest.fn(),
      trackAnonymousEvent: jest.fn(),
    }),
  },
}));

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((cb) => cb()),
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent with the correct params', () => {
    const { result } = renderHookWithProvider(() => useAnalytics());

    const testEvent = 'BUY_BUTTON_CLICKED';

    result.current(testEvent, {
      location: 'Amount to Buy Screen',
      text: 'Buy',
    });

    expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents[testEvent],
      {
        location: 'Amount to Buy Screen',
        text: 'Buy',
      },
    );
  });

  it('calls trackAnonymousEvent with the correct params', () => {
    const { result } = renderHookWithProvider(() => useAnalytics());

    const testEvent = 'RAMP_REGION_SELECTED';
    const testPayload = {
      country_id: 'test-country-id',
      is_unsupported_offramp: false,
      is_unsupported_onramp: false,
    };

    result.current(testEvent, testPayload);

    expect(MetaMetrics.getInstance().trackAnonymousEvent).toHaveBeenCalledWith(
      MetaMetricsEvents[testEvent],
      testPayload,
    );
  });
});
