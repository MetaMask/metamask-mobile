import branch from 'react-native-branch';
import {
  captureAppInstallOnce,
  discardPendingAppInstall,
  replayPendingAppInstall,
} from './appInstallEvent';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import ReduxService, { ReduxStore } from '../../core/redux';
import { MetaMetricsEvents } from '../../core/Analytics';
import { UserProfileProperty } from '../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../Logger';
import type { PendingAppInstall } from '../../reducers/user/types';

let mockExistingUser = false;
let mockAppInstallEventFired = false;
let mockPendingAppInstall: PendingAppInstall | null = null;

jest.mock('../../reducers/user/selectors', () => ({
  selectExistingUser: jest.fn(() => mockExistingUser),
  selectAppInstallEventFired: jest.fn(() => mockAppInstallEventFired),
  selectPendingAppInstall: jest.fn(() => mockPendingAppInstall),
}));

jest.mock('../../actions/user', () => ({
  setAppInstallEventFired: jest.fn(() => ({
    type: 'SET_APP_INSTALL_EVENT_FIRED',
  })),
  setPendingAppInstall: jest.fn((pendingAppInstall) => ({
    type: 'SET_PENDING_APP_INSTALL',
    payload: { pendingAppInstall },
  })),
  clearPendingAppInstall: jest.fn(() => ({
    type: 'CLEAR_PENDING_APP_INSTALL',
  })),
}));

// jest.mock() is hoisted above variable declarations, so the factory must create
// jest.fn() inline. Access the mock through the import after setup.
jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    getFirstReferringParams: jest.fn(),
  },
}));

jest.mock('./analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
    identify: jest.fn(),
    isEnabled: jest.fn(() => false),
  },
}));

jest.mock('./AnalyticsEventBuilder');

jest.mock('../Logger', () => ({
  error: jest.fn(),
}));

const mockGetFirstReferringParams = branch.getFirstReferringParams as jest.Mock;
const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

const SET_FIRED = { type: 'SET_APP_INSTALL_EVENT_FIRED' };
const CLEAR_PENDING = { type: 'CLEAR_PENDING_APP_INSTALL' };

function createMockReduxStore(): ReduxStore {
  return {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
  } as unknown as ReduxStore;
}

describe('appInstallEvent', () => {
  let mockStore: ReduxStore;
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'App Installed',
      properties: {},
      sensitiveProperties: {},
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingUser = false;
    mockAppInstallEventFired = false;
    mockPendingAppInstall = null;
    mockAnalytics.isEnabled.mockReturnValue(false);
    mockAnalytics.trackEvent.mockImplementation(() => undefined);
    mockGetFirstReferringParams.mockResolvedValue({});
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
    );
    mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  describe('captureAppInstallOnce', () => {
    it('records a pending install with the install date on a first launch', async () => {
      await captureAppInstallOnce();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_APP_INSTALL',
        payload: {
          pendingAppInstall: {
            installDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          },
        },
      });
    });

    it('does not emit the event or the trait at capture time', async () => {
      await captureAppInstallOnce();

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
      expect(mockAnalytics.identify).not.toHaveBeenCalled();
    });

    it('skips when the user already has a wallet', async () => {
      mockExistingUser = true;

      await captureAppInstallOnce();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('skips when the event was already emitted', async () => {
      mockAppInstallEventFired = true;

      await captureAppInstallOnce();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('skips when an install is already pending', async () => {
      mockPendingAppInstall = { installDate: '2026-07-01' };

      await captureAppInstallOnce();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    // Regression: an opted-in device cannot be on its first launch. Before the
    // fix, losing the persisted `user` slice made existing installs look new and
    // emitted App Installed for them.
    it('skips when analytics is already enabled even if the user slice looks fresh', async () => {
      mockExistingUser = false;
      mockAppInstallEventFired = false;
      mockPendingAppInstall = null;
      mockAnalytics.isEnabled.mockReturnValue(true);

      await captureAppInstallOnce();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('logs and does not throw when reading state fails', async () => {
      const stateError = new Error('store unavailable');
      (mockStore.getState as jest.Mock).mockImplementation(() => {
        throw stateError;
      });

      await captureAppInstallOnce();

      expect(Logger.error).toHaveBeenCalledWith(
        stateError,
        'AppInstall: Error capturing app install event',
      );
    });
  });

  describe('replayPendingAppInstall', () => {
    beforeEach(() => {
      mockPendingAppInstall = { installDate: '2026-07-01' };
    });

    it('emits the event and the captured install date once consent exists', async () => {
      await replayPendingAppInstall();

      expect(mockAnalytics.identify).toHaveBeenCalledWith({
        [UserProfileProperty.INSTALL_DATE_MOBILE]: '2026-07-01',
      });
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.APP_INSTALLED,
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        mockEventBuilder.build(),
      );
    });

    it('marks the event fired and clears the pending install', async () => {
      await replayPendingAppInstall();

      expect(mockStore.dispatch).toHaveBeenCalledWith(SET_FIRED);
      expect(mockStore.dispatch).toHaveBeenCalledWith(CLEAR_PENDING);
    });

    it('does nothing when there is no pending install', async () => {
      mockPendingAppInstall = null;

      await replayPendingAppInstall();

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('does nothing when the event was already emitted', async () => {
      mockAppInstallEventFired = true;

      await replayPendingAppInstall();

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('adds install_source and deeplink_path for a deferred deeplink install', async () => {
      mockGetFirstReferringParams.mockResolvedValue({
        '+clicked_branch_link': true,
        $deeplink_path: 'buy',
      });

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
        deeplink_path: 'buy',
      });
    });

    it('omits deeplink_path when Branch does not provide one', async () => {
      mockGetFirstReferringParams.mockResolvedValue({
        '+clicked_branch_link': true,
      });

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
      });
    });

    it('adds no attribution properties for an organic install', async () => {
      mockGetFirstReferringParams.mockResolvedValue({
        '+clicked_branch_link': false,
      });

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).not.toHaveBeenCalled();
    });

    // Regression: the install params must come from getFirstReferringParams,
    // which is stable for the install, not getLatestReferringParams, which is
    // empty on a cold start that has not finished Branch session init.
    it('reads install attribution from Branch first referring params', async () => {
      await replayPendingAppInstall();

      expect(mockGetFirstReferringParams).toHaveBeenCalled();
    });

    it('still emits the event when Branch attribution lookup fails', async () => {
      const branchError = new Error('Branch unavailable');
      mockGetFirstReferringParams.mockRejectedValue(branchError);

      await replayPendingAppInstall();

      expect(Logger.error).toHaveBeenCalledWith(
        branchError,
        'AppInstall: Error reading Branch install attribution',
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(SET_FIRED);
    });

    it('keeps the install pending when emitting throws so it can retry', async () => {
      const trackError = new Error('Analytics unavailable');
      mockAnalytics.trackEvent.mockImplementation(() => {
        throw trackError;
      });

      await replayPendingAppInstall();

      expect(Logger.error).toHaveBeenCalledWith(
        trackError,
        'AppInstall: Error replaying app install event',
      );
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(SET_FIRED);
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(CLEAR_PENDING);
    });

    it('retries on a later consent event after a failure', async () => {
      mockAnalytics.trackEvent
        .mockImplementationOnce(() => {
          throw new Error('Analytics unavailable');
        })
        .mockImplementation(() => undefined);

      await replayPendingAppInstall();
      await replayPendingAppInstall();

      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(2);
      expect(mockStore.dispatch).toHaveBeenCalledWith(SET_FIRED);
    });
  });

  describe('discardPendingAppInstall', () => {
    it('clears the pending install when the user declines analytics', () => {
      mockPendingAppInstall = { installDate: '2026-07-01' };

      discardPendingAppInstall();

      expect(mockStore.dispatch).toHaveBeenCalledWith(CLEAR_PENDING);
    });

    it('does not emit anything', () => {
      mockPendingAppInstall = { installDate: '2026-07-01' };

      discardPendingAppInstall();

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
      expect(mockAnalytics.identify).not.toHaveBeenCalled();
    });
  });
});
