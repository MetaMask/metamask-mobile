import trackOnboarding from './trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockEnabled = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn().mockImplementation(() => ({
      isEnabled: mockEnabled,
      trackEvent: mockTrackEvent,
    })),
  },
}));

const mockSaveOnboardingEvent = jest.fn();

describe('trackOnboarding', () => {
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

    mockEnabled.mockReturnValue(false);

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

    mockEnabled.mockReturnValue(false);

    trackOnboarding(mockEvent);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalledWith();
    expect(mockTrackEvent).toHaveBeenCalledWith(mockEvent);
  });

  it('call trackEvent when metrics is enabled', async () => {
    const mockProperties = { prop: 'testProp' };
    const mockEvent = MetricsEventBuilder.createEventBuilder({
      category: 'testEvent',
    })
      .addProperties(mockProperties)
      .build();

    mockEnabled.mockReturnValue(true);

    trackOnboarding(mockEvent);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(mockEvent);
  });
});
