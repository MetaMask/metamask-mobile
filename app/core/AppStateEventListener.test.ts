import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import { AppStateEventListener } from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import ReduxService, { ReduxStore } from './redux';
import { saveAttribution } from './redux/slices/attribution';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { setAppInstallEventFired } from '../actions/user';
import generateDeviceAnalyticsMetaData from '../util/metrics';
import generateUserSettingsAnalyticsMetaData from '../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import branch from 'react-native-branch';

// Default: existing user so trackAppInstallOnce bails early and does not
// interfere with tests that only care about APP_OPENED / identify.
let mockSelectExistingUser = true;
let mockSelectAppInstallEventFired = true;

jest.mock('../reducers/user/selectors', () => ({
  selectExistingUser: jest.fn(() => mockSelectExistingUser),
  selectAppInstallEventFired: jest.fn(() => mockSelectAppInstallEventFired),
}));

jest.mock('../actions/user', () => ({
  setAppInstallEventFired: jest.fn(() => ({
    type: 'SET_APP_INSTALL_EVENT_FIRED',
  })),
}));

// jest.mock() is hoisted above variable declarations, so the factory must
// create jest.fn() inline — referencing an outer variable captures undefined.
// Access the mock via the import after setup.
jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    getLatestReferringParams: jest.fn(),
  },
}));

const mockBranchGetLatestReferringParams =
  branch.getLatestReferringParams as jest.Mock;

function createMockReduxStore(): ReduxStore {
  return {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
  } as unknown as ReduxStore;
}

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

// Flushes all pending microtasks. Prefer over single Promise.resolve()
// for multi-hop async chains (e.g. branch.getLatestReferringParams → then).
const flushPromises = () => new Promise(setImmediate);

describe('AppStateEventListener', () => {
  let appStateManager: AppStateEventListener;
  let mockAppStateListener: (state: AppStateStatus) => void;
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'App Opened',
      properties: {},
      sensitiveProperties: {},
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSelectExistingUser = true;
    mockSelectAppInstallEventFired = true;

    // Prevent a throwing identify implementation from one test bleeding into
    // the next. clearAllMocks preserves implementations; mockReset clears them.
    mockAnalytics.identify.mockReset();

    mockBranchGetLatestReferringParams.mockResolvedValue({});
    mockEventBuilder.addProperties.mockReturnThis();
    mockEventBuilder.build.mockReturnValue({
      name: 'App Opened',
      properties: {},
      sensitiveProperties: {},
    });
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
    );

    // Provide a default store so trackAppInstallOnce (which calls
    // ReduxService.store.getState()) does not throw Logger.error noise in
    // tests that only care about APP_OPENED / identify.
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue(createMockReduxStore());

    appStateManager = new AppStateEventListener();
    appStateManager.start();
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

  it('does not initialize event listener more than once', () => {
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('tracks event when app becomes active and attribution data is available', () => {
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
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
    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      saveAttribution({
        attribution_id: 'test123',
        utm_source: 'source',
        utm_medium: 'medium',
        utm_campaign: 'campaign',
      }),
    );
    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      mockAttribution,
    );
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      mockEventBuilder.build(),
    );
    expect(appStateManager.currentDeeplink).toBeNull();
  });

  it('clears currentDeeplink after processing so a later resume does not re-save attribution', () => {
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
    (processAttribution as jest.Mock)
      .mockReturnValueOnce({
        attributionId: 'x',
        utm_source: 'y',
      })
      .mockReturnValue(undefined);

    appStateManager.setCurrentDeeplink('metamask://x');
    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(appStateManager.currentDeeplink).toBeNull();
    expect(mockStore.dispatch).toHaveBeenCalledWith(
      saveAttribution({
        attribution_id: 'x',
        utm_source: 'y',
      }),
    );

    (mockStore.dispatch as jest.Mock).mockClear();
    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockStore.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: saveAttribution.type }),
    );
  });

  it('tracks event when app becomes active without attribution data', () => {
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue(createMockReduxStore());
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
    );
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      mockEventBuilder.build(),
    );
  });

  it('identifies user when app starts', () => {
    // identify is called in start(), which runs in beforeEach
    expect(mockAnalytics.identify).toHaveBeenCalledWith({
      deviceProp: 'Device value',
      userProp: 'User value',
    });
  });

  it('logs error when identifying user fails', () => {
    mockAnalytics.identify.mockImplementation(() => {
      throw new Error('Test error');
    });
    const newAppStateManager = new AppStateEventListener();
    newAppStateManager.start();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AppStateManager: Error identifying user on app start',
    );
  });

  it('handles errors gracefully', () => {
    const testError = new Error('Test error');
    (processAttribution as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    mockAppStateListener('background');
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
    mockAppStateListener('background');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('does not process app state change when app state has not changed', () => {
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);
    mockAnalytics.trackEvent.mockClear();

    // Sending 'active' again without going through 'background' should not re-fire
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('fires APP_OPENED when transitioning from background through inactive to active (iOS intermediate state)', () => {
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('background');
    mockAppStateListener('inactive');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.APP_OPENED,
    );
    expect(mockAnalytics.trackEvent).toHaveBeenCalled();
  });

  it('does not fire APP_OPENED when transitioning from inactive to active (e.g. system permission dialog dismissed)', () => {
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    mockAppStateListener('inactive');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('handles undefined store gracefully', () => {
    // Simulate the real ReduxService.store throwing when not initialized.
    jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
      throw new Error('Redux store does not exist!');
    });
    const { processAttribution: realProcessAttribution } = jest.requireActual(
      './processAttribution',
    );
    (processAttribution as jest.Mock).mockImplementation(
      realProcessAttribution,
    );

    mockAppStateListener('background');
    mockAppStateListener('active');
    jest.advanceTimersByTime(2000);

    expect(Logger.error).toHaveBeenCalledWith(
      new Error('Redux store does not exist!'),
      'AppStateManager: Error processing app state change',
    );
  });

  describe('trackAppInstallOnce', () => {
    let mockStore: ReturnType<typeof createMockReduxStore>;

    beforeEach(() => {
      // Real timers so flushPromises (setImmediate) works correctly.
      jest.useRealTimers();
      mockStore = createMockReduxStore();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
    });

    it('fires APP_INSTALLED and sets install date trait on first install', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({
        '+is_first_session': false,
        '+clicked_branch_link': false,
      });

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(mockAnalytics.identify).toHaveBeenCalledWith(
        expect.objectContaining({
          [UserProfileProperty.INSTALL_DATE_MOBILE]: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}$/,
          ),
        }),
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_APP_INSTALL_EVENT_FIRED',
      });
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('does not add deeplink properties when install is not from a Branch deferred link', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({
        '+is_first_session': false,
        '+clicked_branch_link': false,
      });

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(mockEventBuilder.addProperties).not.toHaveBeenCalledWith(
        expect.objectContaining({ install_source: 'deeplink' }),
      );
    });

    it('adds install_source and deeplink_path when opened via Branch deferred deeplink', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({
        '+is_first_session': true,
        '+clicked_branch_link': true,
        $deeplink_path: 'buy',
      });

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
        deeplink_path: 'buy',
      });
    });

    it('omits deeplink_path when $deeplink_path is absent', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({
        '+is_first_session': true,
        '+clicked_branch_link': true,
      });

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
      });
    });

    it('skips when existingUser is true', async () => {
      mockSelectExistingUser = true;
      mockSelectAppInstallEventFired = false;

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
    });

    it('skips when event was already fired', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = true;

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
    });

    it('logs error and does not throw when Branch call fails', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      const branchError = new Error('Branch unavailable');
      mockBranchGetLatestReferringParams.mockRejectedValue(branchError);

      const listener = new AppStateEventListener();
      listener.start();
      await flushPromises();

      expect(Logger.error).toHaveBeenCalledWith(
        branchError,
        'AppStateManager: Error tracking app install event',
      );
    });
  });
});
