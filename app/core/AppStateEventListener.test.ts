import { AppState, AppStateStatus } from 'react-native';
import { store } from '../store';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { AppStateEventListener } from './AppStateEventListener';
import { processAttribution } from './processAttribution';

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

jest.mock('./Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(),
  },
  MetaMetricsEvents: {
    APP_OPENED: 'APP_OPENED',
  },
}));

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('./DeeplinkManager/ParseManager/extractURLParams', () => jest.fn());

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./processAttribution', () => ({
  processAttribution: jest.fn(),
}));

describe('AppStateEventListener', () => {
  let appStateManager: AppStateEventListener;
  let mockAppStateListener: (state: AppStateStatus) => void;
  let mockTrackEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockTrackEvent = jest.fn();
    (MetaMetrics.getInstance as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });
    (AppState.addEventListener as jest.Mock).mockImplementation((_, listener) => {
      mockAppStateListener = listener;
      return { remove: jest.fn() };
    });
    appStateManager = new AppStateEventListener();
    appStateManager.init(store);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to AppState changes on instantiation', () => {
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('throws error if store is initialized more than once', () => {
    expect(() => appStateManager.init(store)).toThrow('store is already initialized');
    expect(Logger.error).toHaveBeenCalledWith(new Error('store is already initialized'));
  });

  it('tracks event when app becomes active, data collection is enabled, and deeplink with attribution is present', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (processAttribution as jest.Mock).mockReturnValue({ attributionId: 'test123', utm: 'test_utm' });

    appStateManager.setCurrentDeeplink('metamask://connect?attributionId=test123');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      { attributionId: 'test123', utm: 'test_utm' },
      true
    );
  });

  it('does not track event when data collection is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });
    (processAttribution as jest.Mock).mockReturnValue({ attributionId: undefined, utm: undefined });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      { attributionId: undefined, utm: undefined },
      true
    );
  });

  it('does not track event when there is no deeplink', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (processAttribution as jest.Mock).mockReturnValue({ attributionId: undefined, utm: undefined });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      { attributionId: undefined, utm: undefined },
      true
    );
  });

  it('cleans up the AppState listener on cleanup', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    appStateManager = new AppStateEventListener();
    appStateManager.init(store);
    appStateManager.cleanup();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should not process app state change when app is not becoming active', () => {
    mockAppStateListener('background');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should not process app state change when app state has not changed', () => {
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);
    mockTrackEvent.mockClear();

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should handle undefined store gracefully', () => {
    appStateManager = new AppStateEventListener();
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(new Error('store is not initialized'));
  });
});
