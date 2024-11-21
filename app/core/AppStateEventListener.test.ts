import { AppState, AppStateStatus } from 'react-native';
import { store } from '../store';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { AppStateEventListener } from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./processAttribution', () => ({
  processAttribution: jest.fn(),
}));

jest.mock('./Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn().mockImplementation(() => Promise.resolve()),
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
    jest.useFakeTimers();
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    appStateManager = new AppStateEventListener();
    appStateManager.init(store);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to AppState changes on instantiation', () => {
    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('throws error if store is initialized more than once', () => {
    expect(() => appStateManager.init(store)).toThrow(
      'store is already initialized',
    );
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('store is already initialized'),
    );
  });

  it('tracks event when app becomes active and attribution data is available', () => {
    const mockAttribution = {
      attributionId: 'test123',
      utm: 'test_utm',
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

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.APP_OPENED)
        .addSensitiveProperties({
          attributionId: 'test123',
          utm_source: 'source',
          utm_medium: 'medium',
          utm_campaign: 'campaign',
        })
        .build(),
      true,
    );
  });

  it('does not track event when processAttribution returns undefined', () => {
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', () => {
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
    appStateManager.init(store);
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
    appStateManager = new AppStateEventListener();
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('store is not initialized'),
    );
  });
});
