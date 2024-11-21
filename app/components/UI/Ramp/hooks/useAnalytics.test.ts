import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';

jest.mock('../../../../core/Analytics', () => ({
  ...jest.requireActual('../../../../core/Analytics'),
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      trackEvent: jest.fn(),
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

  it('calls trackEvent for non-anonymous params', () => {
    const { result } = renderHookWithProvider(() => useAnalytics());

    const testEvent = 'BUY_BUTTON_CLICKED';
    const testEventParams = {
      location: 'Amount to Buy Screen',
      text: 'Buy',
    } as const;

    result.current(testEvent, testEventParams);

    expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents[testEvent])
        .addProperties(testEventParams)
        .build(),
    );
  });

  it('calls trackEvent for anonymous params', () => {
    const testEvent = 'RAMP_REGION_SELECTED';
    const testEventParams = {
      country_id: 'test-country-id',
      is_unsupported_offramp: false,
      is_unsupported_onramp: false,
    } as const;

    jest.mock('../constants', () => ({
      AnonymousEvents: [testEvent],
    }));

    const { result } = renderHookWithProvider(() => useAnalytics());

    result.current(testEvent, testEventParams);

    expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents[testEvent])
        .addSensitiveProperties(testEventParams)
        .build(),
    );
  });
});
