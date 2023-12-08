import trackAfterInteractions from './trackAfterInteractions';

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

describe('trackAfterInteractions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls saveOnboardingEvent when metrics is not enabled', async () => {
    const mockEvent = { category: 'testEvent' };
    const mockProperties = { prop: 'testProp' };

    mockEnabled.mockReturnValue(false);

    await trackAfterInteractions(
      mockEvent,
      mockProperties,
      mockSaveOnboardingEvent,
    );

    expect(mockSaveOnboardingEvent).toHaveBeenCalledWith(mockEvent.category);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('call trackEvent when metrics is not enabled but saveOnboardingEvent is not defined', async () => {
    const mockEvent = { category: 'testEvent' };
    const mockProperties = { prop: 'testProp' };

    mockEnabled.mockReturnValue(true);

    await trackAfterInteractions(mockEvent, mockProperties);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalledWith();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockEvent.category,
      mockProperties,
    );
  });

  it('call trackEvent when metrics is enabled', async () => {
    const mockEvent = { category: 'testEvent' };
    const mockProperties = { prop: 'testProp' };

    mockEnabled.mockReturnValue(true);

    await trackAfterInteractions(mockEvent, mockProperties);

    expect(mockSaveOnboardingEvent).not.toHaveBeenCalledWith();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockEvent.category,
      mockProperties,
    );
  });
});
