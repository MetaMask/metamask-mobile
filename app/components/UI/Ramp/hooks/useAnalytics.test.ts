import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../../core/Analytics', () => ({
  ...jest.requireActual('../../../../core/Analytics'),
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      trackEvent: jest.fn(),
      updateDataRecordingFlag: jest.fn(),
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

    const testEvent = 'RAMPS_BUTTON_CLICKED';
    const testEventParams = {
      location: 'Amount to Buy Screen',
      text: 'Buy',
      ramp_type: 'BUY',
      region: 'US',
    } as const;

    result.current(testEvent, testEventParams);

    expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents[testEvent])
        .addProperties(testEventParams)
        .build(),
    );
  });
});
