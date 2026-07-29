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
    getLatestReferringParams: jest.fn(),
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

const mockGetLatestReferringParams =
  branch.getLatestReferringParams as jest.Mock;
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
    mockGetLatestReferringParams.mockResolvedValue({});
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

    it('stores Branch attribution when a direct-tap Branch link drove the install', async () => {
      mockGetLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': true,
        $deeplink_path: 'buy',
      });

      await captureAppInstallOnce();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_APP_INSTALL',
        payload: {
          pendingAppInstall: {
            installDate: expect.any(String),
            branchAttribution: { clickedBranchLink: true, deeplinkPath: 'buy' },
          },
        },
      });
    });

    it('stores Branch attribution for NativeLink (pasted link) install', async () => {
      mockGetLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': false,
        $deeplink_path: 'perps-asset?symbol=BTC',
      });

      await captureAppInstallOnce();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_APP_INSTALL',
        payload: {
          pendingAppInstall: {
            installDate: expect.any(String),
            branchAttribution: {
              clickedBranchLink: false,
              deeplinkPath: 'perps-asset?symbol=BTC',
            },
          },
        },
      });
    });

    it('stores no branchAttribution for an organic install', async () => {
      mockGetLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': false,
      });

      await captureAppInstallOnce();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_APP_INSTALL',
        payload: {
          pendingAppInstall: {
            installDate: expect.any(String),
          },
        },
      });
    });

    // Regression: branch.subscribe does not fire on iOS cold start after the new
    // RN architecture upgrade, so getFirstReferringParams never gets populated.
    // Attribution must be read via getLatestReferringParams at capture time
    // (first launch = install session) so it bypasses the subscribe dependency.
    it('reads Branch attribution via getLatestReferringParams at capture time', async () => {
      await captureAppInstallOnce();

      expect(mockGetLatestReferringParams).toHaveBeenCalled();
    });

    it('still captures install date when Branch attribution lookup fails', async () => {
      mockGetLatestReferringParams.mockRejectedValue(
        new Error('Branch unavailable'),
      );

      await captureAppInstallOnce();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_APP_INSTALL',
        payload: {
          pendingAppInstall: {
            installDate: expect.any(String),
          },
        },
      });
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

    it('adds install_source and deeplink_path from stored branchAttribution', async () => {
      mockPendingAppInstall = {
        installDate: '2026-07-01',
        branchAttribution: { clickedBranchLink: true, deeplinkPath: 'buy' },
      };

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
        deeplink_path: 'buy',
      });
    });

    it('adds install_source without deeplink_path when path is absent', async () => {
      mockPendingAppInstall = {
        installDate: '2026-07-01',
        branchAttribution: { clickedBranchLink: true },
      };

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
      });
    });

    it('adds attribution for NativeLink (pasted link) stored at capture time', async () => {
      mockPendingAppInstall = {
        installDate: '2026-07-01',
        branchAttribution: {
          clickedBranchLink: false,
          deeplinkPath: 'perps-asset?symbol=BTC',
        },
      };

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        install_source: 'deeplink',
        deeplink_path: 'perps-asset?symbol=BTC',
      });
    });

    it('adds no attribution properties for an organic install', async () => {
      mockPendingAppInstall = { installDate: '2026-07-01' };

      await replayPendingAppInstall();

      expect(mockEventBuilder.addProperties).not.toHaveBeenCalled();
    });

    it('does not call Branch at replay time', async () => {
      await replayPendingAppInstall();

      expect(mockGetLatestReferringParams).not.toHaveBeenCalled();
    });

    it('still emits the event when replay throws', async () => {
      const trackError = new Error('Analytics unavailable');
      mockAnalytics.trackEvent.mockImplementation(() => {
        throw trackError;
      });

      await replayPendingAppInstall();

      expect(Logger.error).toHaveBeenCalledWith(
        trackError,
        'AppInstall: Error replaying app install event',
      );
    });

    it('keeps the install pending when emitting throws so it can retry', async () => {
      const trackError = new Error('Analytics unavailable');
      mockAnalytics.trackEvent.mockImplementation(() => {
        throw trackError;
      });

      await replayPendingAppInstall();

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
