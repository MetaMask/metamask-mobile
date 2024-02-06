import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';

jest.mock('../../../core/Analytics/MetaMetrics');

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockMetrics = {
  trackEvent: jest.fn(),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('trackErrorAsAnalytics', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent with error name', async () => {
    const testEvent = { category: 'testEvent' };
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    trackErrorAsAnalytics(testEvent, errorMessage, otherInfo);

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith('Error occurred', {
      error: true,
      event: testEvent.category,
      errorMessage,
      otherInfo,
    });
  });
});
