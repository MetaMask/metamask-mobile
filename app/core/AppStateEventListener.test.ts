import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { AppStateEventListener } from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';
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

jest.mock('./Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
  isEnabled: jest.fn(() => true),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('AppStateEventListener', () => {
  let appStateManager: AppStateEventListener;
  let mockAppStateListener: (state: AppStateStatus) => void;

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

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.APP_OPENED,
    )
      .addProperties({
        attributionId: 'test123',
        utm_source: 'source',
        utm_medium: 'medium',
        utm_campaign: 'campaign',
      })
      .build();

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('tracks event when app becomes active without attribution data', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.APP_OPENED,
      ).build(),
    );
  });

  it('identifies user when app becomes active', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledTimes(1);
    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      deviceProp: 'Device value',
      userProp: 'User value',
    });
  });

  it('logs error when identifying user fails', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({} as unknown as ReduxStore);
    const testError = new Error('Test error');
    mockMetrics.addTraitsToUser.mockImplementation(() => {
      throw testError;
    });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(Logger.error).toHaveBeenCalledWith(
      testError,
      'AppStateManager: Error processing app state change',
    );
    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', () => {
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
    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
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

  it('should not process app state change when app is not becoming active', () => {
    mockAppStateListener('background');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });

  it('should not process app state change when app state has not changed', () => {
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);
    mockMetrics.trackEvent.mockClear();

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });

  it('should handle undefined store gracefully', () => {
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
