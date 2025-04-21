import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../core/Analytics/MetaMetrics');

// create mock for shouldTrackExpectedErrors
const shouldTrackMock = jest.requireMock('../shouldTrackExpectedErrors/shouldTrackExpectedErrors');
jest.mock('../shouldTrackExpectedErrors/shouldTrackExpectedErrors', () => ({
  shouldTrackExpectedErrors: jest.fn(() => Promise.resolve(true)),
}));

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) => {
  await callback();
});

const mockMetrics = {
  trackEvent: jest.fn(),
};

jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => mockMetrics,
}));

describe('trackErrorAsAnalytics', () => {
  beforeEach(() => {
    shouldTrackMock.shouldTrackExpectedErrors.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent with event object', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    await trackErrorAsAnalytics(testEvent, errorMessage, otherInfo);
    await new Promise(process.nextTick);

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

    await trackErrorAsAnalytics(testEventName, errorMessage, otherInfo);
    await new Promise(process.nextTick);

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

    await trackErrorAsAnalytics(testEvent, errorMessage);
    await new Promise(process.nextTick);

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
    shouldTrackMock.shouldTrackExpectedErrors.mockResolvedValue(false);

    await trackErrorAsAnalytics('testEvent', 'This is an error message');
    await new Promise(process.nextTick);

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });
});
