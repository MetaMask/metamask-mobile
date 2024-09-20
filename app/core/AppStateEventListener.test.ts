import { AppState, AppStateStatus } from 'react-native';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { store } from '../store';
import AppStateEventListener from './AppStateEventListener';
import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';
import Logger from '../util/Logger';

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

describe('AppStateManager', () => {
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to AppState changes on instantiation', () => {
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('tracks event when app becomes active and conditions are met', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({ params: { attributionId: 'test123' } });

    appStateManager.setCurrentDeeplink('metamask://connect?attributionId=test123');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      { attributionId: 'test123' },
      true
    );
  });

  it('does not track event when data collection is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      {},
      true
    );
  });

  it('does not track event when there is no deeplink', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
      { attributionId: undefined },
      true
    );
  });

  it('handles errors gracefully', () => {
    (store.getState as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AppStateManager: Error processing app state change'
    );
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('cleans up the AppState listener on cleanup', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    appStateManager = new AppStateEventListener();
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
});
