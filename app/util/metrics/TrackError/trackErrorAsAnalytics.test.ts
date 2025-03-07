import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const VALID_UUID = 'b7bff9d5-8928-488e-935e-4522c680242e';

jest.mock('../../../core/Analytics/MetaMetrics');

const constantMock = jest.requireMock('../shouldTrackExpectedErrors/constants');
jest.mock('../shouldTrackExpectedErrors/constants', () => ({
  EXPECTED_ERRORS_PORTION_TO_TRACK: 1,
}));

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockMetrics = {
  trackEvent: jest.fn(),
  getMetaMetricsId: jest.fn(() => VALID_UUID),
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
});
