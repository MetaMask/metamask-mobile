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

  it('calls trackEvent with event object', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    trackErrorAsAnalytics(testEvent, errorMessage, otherInfo);

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      { category: 'Error occurred' },
      {
        error: true,
        type: testEvent,
        errorMessage,
        otherInfo,
      },
    );
  });

  it('calls trackEvent with event name string', async () => {
    const testEventName = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    trackErrorAsAnalytics(testEventName, errorMessage, otherInfo);

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      { category: 'Error occurred' },
      {
        error: true,
        type: testEventName,
        errorMessage,
        otherInfo,
      },
    );
  });

  it('calls trackEvent without otherInfo', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';

    trackErrorAsAnalytics(testEvent, errorMessage);

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      { category: 'Error occurred' },
      {
        error: true,
        type: testEvent,
        errorMessage,
      },
    );
  });
});
