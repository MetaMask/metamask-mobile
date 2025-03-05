import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../core/Analytics/MetaMetrics');

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockMetrics = {
  trackEvent: jest.fn(),
  getShouldTrackExpectedErrors: jest.fn(() => true),
};

jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => mockMetrics,
}));

describe('trackErrorAsAnalytics', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent with event object', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    trackErrorAsAnalytics(testEvent, errorMessage, otherInfo);

    const expectedEvent = MetricsEventBuilder.createEventBuilder({
      category: 'Error occurred',
    })
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent with event name string', async () => {
    const testEventName = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    trackErrorAsAnalytics(testEventName, errorMessage, otherInfo);

    const expectedEvent = MetricsEventBuilder.createEventBuilder({
      category: 'Error occurred',
    })
      .addProperties({
        error: true,
        type: testEventName,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent without otherInfo', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';

    trackErrorAsAnalytics(testEvent, errorMessage);

    const expectedEvent = MetricsEventBuilder.createEventBuilder({
      category: 'Error occurred',
    })
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
      })
      .build();
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not call trackEvent if shouldTrackExpectedErrors is false', async () => {
    mockMetrics.getShouldTrackExpectedErrors.mockReturnValue(false);

    trackErrorAsAnalytics('testEvent', 'This is an error message');

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });
});
