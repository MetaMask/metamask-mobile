// Import directly from source files to avoid circular dependency
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import MetaMetrics from '../../../../core/Analytics/MetaMetrics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

// Mock MetaMetrics directly from source file to avoid circular dependency
jest.mock('../../../../core/Analytics/MetaMetrics', () => ({
  __esModule: true,
  default: {
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
});
