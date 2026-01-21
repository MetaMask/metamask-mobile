import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import { AppStateEventListener } from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import ReduxService, { ReduxStore } from './redux';

jest.mock('./DeeplinkManager/utils/extractURLParams', () => jest.fn());

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./processAttribution', () => ({
  processAttribution: jest.fn(),
}));

jest.mock(
  '../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

jest.mock('../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
    identify: jest.fn(),
    isEnabled: jest.fn(() => true),
  },
}));

jest.mock('../util/analytics/AnalyticsEventBuilder');

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('AppStateEventListener', () => {
  let appStateManager: AppStateEventListener;
  let mockAppStateListener: (state: AppStateStatus) => void;
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    setSaveDataRecording: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'App Opened',
      properties: {},
      saveDataRecording: true,
      sensitiveProperties: {},
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
    );
    appStateManager = new AppStateEventListener();
    appStateManager.start();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('subscribes to AppState changes on instantiation', () => {
    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('does not initialize event listener more than once', () => {
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('tracks event when app becomes active and attribution data is available', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    const mockAttribution = {
      attributionId: 'test123',
      utm_source: 'source',
      utm_medium: 'medium',
      utm_campaign: 'campaign',
    };
    (processAttribution as jest.Mock).mockReturnValue(mockAttribution);

    appStateManager.setCurrentDeeplink(
      'metamask://connect?attributionId=test123',
    );
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
    );
    expect(mockEventBuilder.setSaveDataRecording).toHaveBeenCalledWith(true);
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      mockAttribution,
    );
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      mockEventBuilder.build(),
    );
  });

  it('tracks event when app becomes active without attribution data', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
    );
    expect(mockEventBuilder.setSaveDataRecording).toHaveBeenCalledWith(true);
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      mockEventBuilder.build(),
    );
  });

  it('identifies user when app starts', () => {
    // The identify is called in start(), which is called in beforeEach
    // So we just verify it was called with the combined traits
    expect(mockAnalytics.identify).toHaveBeenCalledWith({
      deviceProp: 'Device value',
      userProp: 'User value',
    });
  });

  it('logs error when identifying user fails', () => {
    jest.clearAllMocks();
    mockAnalytics.identify.mockImplementation(() => {
      throw new Error('Test error');
    });

    // Create a new instance to trigger the error in identifyUserOnAppStart
    const newAppStateManager = new AppStateEventListener();
    newAppStateManager.start();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AppStateManager: Error identifying user on app start',
    );
  });

  it('handles errors gracefully', () => {
    jest.clearAllMocks();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    const testError = new Error('Test error');
    (processAttribution as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(Logger.error).toHaveBeenCalledWith(
      testError,
      'AppStateManager: Error processing app state change',
    );
    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('cleans up the AppState listener on cleanup', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });

    appStateManager = new AppStateEventListener();
    appStateManager.start();
    appStateManager.cleanup();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('does not process app state change when app is not becoming active', () => {
    jest.clearAllMocks();
    mockAppStateListener('background');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('does not process app state change when app state has not changed', () => {
    jest.clearAllMocks();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);
    mockAnalytics.trackEvent.mockClear();

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('handles undefined store gracefully', () => {
    jest.clearAllMocks();
    const { processAttribution: realProcessAttribution } = jest.requireActual(
      './processAttribution',
    );
    (processAttribution as jest.Mock).mockImplementation(
      realProcessAttribution,
    );

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    const missingReduxStoreError = new Error('Redux store does not exist!');
    const appStateManagerErrorMessage =
      'AppStateManager: Error processing app state change';
    expect(Logger.error).toHaveBeenCalledWith(
      missingReduxStoreError,
      appStateManagerErrorMessage,
    );
  });
});
