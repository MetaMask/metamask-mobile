import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
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
});
