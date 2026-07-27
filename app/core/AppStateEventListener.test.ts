import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import {
  AppStateEventListener,
  trackAppInstallOnce,
} from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import ReduxService, { ReduxStore } from './redux';
import { saveAttribution } from './redux/slices/attribution';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
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
    jest.resetModules();
    jest.useFakeTimers();
    mockSelectExistingUser = true;
    mockSelectAppInstallEventFired = true;
    // Prevent a throwing identify implementation from one test bleeding into
    // the next (clearAllMocks preserves implementations; mockReset clears them).
    mockAnalytics.identify.mockReset();
    mockBranchGetLatestReferringParams.mockResolvedValue({});
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
      .mockReturnValue(createMockReduxStore());
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
    jest.clearAllMocks();
    mockAppStateListener('background');
    jest.advanceTimersByTime(2000);

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
  });

  it('does not process app state change when app state has not changed', () => {
    jest.clearAllMocks();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue(createMockReduxStore());
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
    jest.clearAllMocks();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue(createMockReduxStore());
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    // Simulate iOS background → inactive → active sequence
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
    jest.clearAllMocks();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue(createMockReduxStore());
    (processAttribution as jest.Mock).mockReturnValue(undefined);

    // Simulate iOS system permission dialog: active → inactive → active
    mockAppStateListener('inactive');
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

    mockAppStateListener('background');
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

  describe('trackAppInstallOnce', () => {
    let mockStore: ReturnType<typeof createMockReduxStore>;

    beforeEach(() => {
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

      await trackAppInstallOnce();

      expect(mockAnalytics.identify).toHaveBeenCalledWith(
        expect.objectContaining({
          [UserProfileProperty.INSTALL_DATE_MOBILE]:
            expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
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

      await trackAppInstallOnce();

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

      await trackAppInstallOnce();

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

      await trackAppInstallOnce();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
      });
    });

    it('skips when existingUser is true', async () => {
      mockSelectExistingUser = true;
      mockSelectAppInstallEventFired = false;

      await trackAppInstallOnce();

      expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
    });

    it('skips when event was already fired', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = true;

      await trackAppInstallOnce();

      expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
    });

    it('logs error and does not throw when Branch call fails', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      const branchError = new Error('Branch unavailable');
      mockBranchGetLatestReferringParams.mockRejectedValue(branchError);

      await trackAppInstallOnce();

      expect(Logger.error).toHaveBeenCalledWith(
        branchError,
        'AppStateManager: Error tracking app install event',
      );
      expect(mockStore.dispatch).not.toHaveBeenCalledWith({
        type: 'SET_APP_INSTALL_EVENT_FIRED',
      });
    });

    it('does not mark event fired when trackEvent throws so install can retry', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({});
      const trackError = new Error('Analytics unavailable');
      mockAnalytics.trackEvent.mockImplementation(() => {
        throw trackError;
      });

      await trackAppInstallOnce();

      expect(Logger.error).toHaveBeenCalledWith(
        trackError,
        'AppStateManager: Error tracking app install event',
      );
      expect(mockStore.dispatch).not.toHaveBeenCalledWith({
        type: 'SET_APP_INSTALL_EVENT_FIRED',
      });
    });

    it('retries tracking after a prior failure', async () => {
      mockSelectExistingUser = false;
      mockSelectAppInstallEventFired = false;
      mockBranchGetLatestReferringParams.mockResolvedValue({});
      mockAnalytics.trackEvent
        .mockImplementationOnce(() => {
          throw new Error('Analytics unavailable');
        })
        .mockImplementation(() => undefined);

      await trackAppInstallOnce();
      await trackAppInstallOnce();

      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(2);
      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_APP_INSTALL_EVENT_FIRED',
      });
    });
  });
});
