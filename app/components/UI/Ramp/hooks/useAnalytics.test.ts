import { MetaMetricsEvents } from '../../../../core/Analytics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
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

    const testEvent = 'RAMPS_BUTTON_CLICKED';
    const testEventParams = {
      location: 'Amount to Buy Screen',
      text: 'Buy',
      ramp_type: 'BUY',
      region: 'US',
    } as const;

    result.current(testEvent, testEventParams);

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents[testEvent])
        .addProperties(testEventParams)
        .build(),
    );
  });
});
