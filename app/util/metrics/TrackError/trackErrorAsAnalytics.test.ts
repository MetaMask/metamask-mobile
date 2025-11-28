// create mock for shouldTrackExpectedErrors
const shouldTrackMock = jest.requireMock(
  '../shouldTrackExpectedErrors/shouldTrackExpectedErrors',
);
jest.mock('../shouldTrackExpectedErrors/shouldTrackExpectedErrors', () => ({
  shouldTrackExpectedErrors: jest.fn(() => Promise.resolve(true)),
}));

const mockTrackEvent = jest.fn();

jest.mock('../../../core/Analytics/analytics', () => {
  const actualAnalyticsEventBuilder = jest.requireActual(
    '../../../core/Analytics/AnalyticsEventBuilder',
  );
  return {
    __esModule: true,
    analytics: {
      trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    },
    AnalyticsEventBuilder: actualAnalyticsEventBuilder.AnalyticsEventBuilder,
  };
});

import trackErrorAsAnalytics from './trackErrorAsAnalytics';
import { AnalyticsEventBuilder } from '../../../core/Analytics/AnalyticsEventBuilder';

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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      'Error occurred',
    )
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent with event name string', async () => {
    const testEventName = 'testEvent';
    const errorMessage = 'This is an error message';
    const otherInfo = 'Other info about the error';

    await trackErrorAsAnalytics(testEventName, errorMessage, otherInfo);

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      'Error occurred',
    )
      .addProperties({
        error: true,
        type: testEventName,
        errorMessage,
        otherInfo,
      })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls trackEvent without otherInfo', async () => {
    const testEvent = 'testEvent';
    const errorMessage = 'This is an error message';

    await trackErrorAsAnalytics(testEvent, errorMessage);

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      'Error occurred',
    )
      .addProperties({
        error: true,
        type: testEvent,
        errorMessage,
      })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not call trackEvent if shouldTrackExpectedErrors is false', async () => {
    shouldTrackMock.shouldTrackExpectedErrors.mockResolvedValue(false);

    await trackErrorAsAnalytics('testEvent', 'This is an error message');

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
