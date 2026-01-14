import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { EVENT_NAME } from '../../../core/Analytics';

// create mock for shouldTrackExpectedErrors
const shouldTrackMock = jest.requireMock(
  '../shouldTrackExpectedErrors/shouldTrackExpectedErrors',
);
jest.mock('../shouldTrackExpectedErrors/shouldTrackExpectedErrors', () => ({
  shouldTrackExpectedErrors: jest.fn(() => Promise.resolve(true)),
}));

// Mock the analytics utility
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) => {
  await callback();
});

describe('trackErrorAsAnalytics', () => {
  beforeEach(() => {
    shouldTrackMock.shouldTrackExpectedErrors.mockResolvedValue(true);
    jest.clearAllMocks();
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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder({
      category: EVENT_NAME.ERROR,
    })
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent with event name string', async () => {
    const testEventName = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    await trackErrorAsAnalytics(testEventName, errorMessage, otherInfo);
    await new Promise(process.nextTick);

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder({
      category: EVENT_NAME.ERROR,
    })
      .addProperties({
        error: true,
        type: testEventName,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent without otherInfo', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';

    await trackErrorAsAnalytics(testEvent, errorMessage);
    await new Promise(process.nextTick);

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder({
      category: EVENT_NAME.ERROR,
    })
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
      })
      .build();
    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not call trackEvent if shouldTrackExpectedErrors is false', async () => {
    shouldTrackMock.shouldTrackExpectedErrors.mockResolvedValue(false);

    await trackErrorAsAnalytics('testEvent', 'This is an error message');
    await new Promise(process.nextTick);

    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });
});
