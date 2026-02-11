import trackOnboarding from './trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockIsEnabled = jest.fn();
const mockTrackEvent = jest.fn();

// Mock the analytics utility
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

const mockSaveOnboardingEvent = jest.fn();

describe('trackOnboarding', () => {
  beforeEach(() => {
    (analytics.isEnabled as jest.Mock) = mockIsEnabled;
    (analytics.trackEvent as jest.Mock) = mockTrackEvent;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls saveOnboardingEvent when metrics is not enabled', async () => {
    const mockProperties = { prop: 'testProp' };
    const mockEvent = MetricsEventBuilder.createEventBuilder({
      category: 'testEvent',
    })
      .addProperties(mockProperties)
      .build();

    mockIsEnabled.mockReturnValue(false);

    trackOnboarding(mockEvent, mockSaveOnboardingEvent);

    expect(mockSaveOnboardingEvent).toHaveBeenCalledWith(mockEvent);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('call trackEvent when metrics is not enabled but saveOnboardingEvent is not defined', async () => {
    const mockProperties = { prop: 'testProp' };
    const mockEvent = MetricsEventBuilder.createEventBuilder({
      category: 'testEvent',
    })
      .addProperties(mockProperties)
      .build();

    mockIsEnabled.mockReturnValue(false);

    trackOnboarding(mockEvent);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalledWith();
    // Convert ITrackingEvent to AnalyticsTrackingEvent format
    const expectedEvent =
      AnalyticsEventBuilder.createEventBuilder(mockEvent).build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('call trackEvent when metrics is enabled', async () => {
    const mockProperties = { prop: 'testProp' };
    const mockEvent = MetricsEventBuilder.createEventBuilder({
      category: 'testEvent',
    })
      .addProperties(mockProperties)
      .build();

    mockIsEnabled.mockReturnValue(true);

    trackOnboarding(mockEvent);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalled();
    // Convert ITrackingEvent to AnalyticsTrackingEvent format
    const expectedEvent =
      AnalyticsEventBuilder.createEventBuilder(mockEvent).build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });
});
