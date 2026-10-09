import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import {
  AppOpenedPushProvider,
  AppStateEventListener,
} from './AppStateEventListener';
import { processAttribution } from './processAttribution';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import ReduxService, { ReduxStore } from './redux';
import { saveAttribution } from './redux/slices/attribution';
import { captureAppInstallOnce } from '../util/analytics/appInstallEvent';

jest.mock('../util/analytics/appInstallEvent', () => ({
  captureAppInstallOnce: jest.fn(),
}));

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
    // Prevent a throwing identify implementation from one test bleeding into
    // the next (clearAllMocks preserves implementations; mockReset clears them).
    mockAnalytics.identify.mockReset();
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
    // Flush the cold-start APP_OPENED scheduled by start() so each test
    // only observes its own events.
    jest.advanceTimersByTime(2000);
    mockAnalytics.trackEvent.mockClear();
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockClear();
    mockEventBuilder.addProperties.mockClear();
    (Logger.error as jest.Mock).mockClear();
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
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      type: 'warm_start',
      source: 'deeplink',
    });
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
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      type: 'warm_start',
      source: 'direct',
    });
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

  it('records a first install on start so it can be emitted after consent', () => {
    expect(captureAppInstallOnce).toHaveBeenCalledTimes(1);
  });

  describe('cold start', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockEventBuilder,
      );
      jest
        .spyOn(ReduxService, 'store', 'get')
        .mockReturnValue(createMockReduxStore());
      (processAttribution as jest.Mock).mockReturnValue(undefined);
    });

    it('fires APP_OPENED with type cold_start after start()', () => {
      const coldStartManager = new AppStateEventListener();
      coldStartManager.start();
      jest.advanceTimersByTime(2000);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.APP_OPENED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'cold_start',
        source: 'direct',
      });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('waits for the deeplink-settling delay before firing', () => {
      const coldStartManager = new AppStateEventListener();
      coldStartManager.start();

      jest.advanceTimersByTime(1999);
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires cold start only once when start() is called twice', () => {
      const coldStartManager = new AppStateEventListener();
      coldStartManager.start();
      coldStartManager.start();
      jest.advanceTimersByTime(2000);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('includes attribution properties when opened via deeplink', () => {
      const mockStore = createMockReduxStore();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
      const mockAttribution = {
        attributionId: 'cold123',
        utm_source: 'source',
      };
      (processAttribution as jest.Mock).mockReturnValue(mockAttribution);

      const coldStartManager = new AppStateEventListener();
      coldStartManager.start();
      coldStartManager.setCurrentDeeplink(
        'metamask://connect?attributionId=cold123',
      );
      jest.advanceTimersByTime(2000);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        saveAttribution({
          attribution_id: 'cold123',
          utm_source: 'source',
        }),
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'cold_start',
        source: 'deeplink',
      });
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        mockAttribution,
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('still fires a warm start APP_OPENED after the cold start one', () => {
      let coldStartListener: (state: AppStateStatus) => void = () => undefined;
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (_, listener) => {
          coldStartListener = listener;
          return { remove: jest.fn() };
        },
      );

      const coldStartManager = new AppStateEventListener();
      coldStartManager.start();
      jest.advanceTimersByTime(2000);
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'cold_start',
        source: 'direct',
      });

      coldStartListener('background');
      coldStartListener('active');
      jest.advanceTimersByTime(2000);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'warm_start',
        source: 'direct',
      });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('App Opened source', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockEventBuilder,
      );
      jest
        .spyOn(ReduxService, 'store', 'get')
        .mockReturnValue(createMockReduxStore());
      (processAttribution as jest.Mock).mockReturnValue(undefined);
    });

    const warmOpen = () => {
      mockAppStateListener('background');
      mockAppStateListener('active');
      jest.advanceTimersByTime(2000);
    };

    it('reports push_notification when opened from an FCM push deeplink', () => {
      appStateManager.setCurrentDeeplink(
        'metamask://notification',
        'push-notification',
      );
      warmOpen();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'warm_start',
        source: 'push_notification',
      });
    });

    it('reports push_notification when opened from a Braze push deeplink', () => {
      appStateManager.setCurrentDeeplink('metamask://promo', 'braze');
      warmOpen();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'warm_start',
        source: 'push_notification',
      });
    });

    it('reports deeplink when opened from an external link without a source', () => {
      appStateManager.setCurrentDeeplink('https://link.metamask.io/swap');
      warmOpen();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'warm_start',
        source: 'deeplink',
      });
    });

    it('reverts to direct on the next open after a deeplink open', () => {
      appStateManager.setCurrentDeeplink(
        'metamask://notification',
        'push-notification',
      );
      warmOpen();
      mockEventBuilder.addProperties.mockClear();

      warmOpen();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        type: 'warm_start',
        source: 'direct',
      });
    });

    // A single push tap reaches handleDeeplink twice, and the second delivery
    // carries no source. Both orderings occur in the wild: on iOS the Branch
    // re-delivery of a Braze universal link lands after the tagged JS event
    // (it needs a network round trip), while on Android the Braze auto-opened
    // intent and the tagged Braze event race.
    describe('duplicate push delivery', () => {
      it('keeps the braze origin when Branch re-delivers the rewritten URI untagged', () => {
        appStateManager.setCurrentDeeplink(
          'https://link.metamask.io/AbCd1234',
          'braze',
        );
        appStateManager.setCurrentDeeplink('https://link.metamask.io/swap');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
        });
      });

      it('keeps the FCM origin when the same URI is re-delivered untagged', () => {
        appStateManager.setCurrentDeeplink(
          'metamask://notification',
          'push-notification',
        );
        appStateManager.setCurrentDeeplink('metamask://notification');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
        });
      });

      it('applies the braze origin when the untagged delivery arrives first', () => {
        appStateManager.setCurrentDeeplink('metamask://promo');
        appStateManager.setCurrentDeeplink('metamask://promo', 'braze');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
        });
      });

      // Same-URI duplicates never reach setCurrentDeeplink — handleDeeplink
      // suppresses them — so the tagged delivery arrives via promotion instead.
      it('promotes the origin when the tagged delivery was suppressed as a duplicate', () => {
        appStateManager.setCurrentDeeplink('metamask://promo');
        appStateManager.promoteCurrentDeeplinkSource(
          'metamask://promo',
          'braze',
        );
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
        });
      });

      it('does not promote the origin of a different deeplink', () => {
        appStateManager.setCurrentDeeplink('metamask://swap');
        appStateManager.promoteCurrentDeeplinkSource(
          'metamask://promo',
          'braze',
        );
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('does not promote when the suppressed duplicate carries no push source', () => {
        appStateManager.setCurrentDeeplink('metamask://promo');
        appStateManager.promoteCurrentDeeplinkSource('metamask://promo');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('does not invent an origin when there is no current deeplink', () => {
        appStateManager.promoteCurrentDeeplinkSource(
          'metamask://promo',
          'braze',
        );
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'direct',
        });
      });

      it('does not make a non-push origin sticky', () => {
        appStateManager.setCurrentDeeplink(
          'https://link.metamask.io/swap',
          'deeplink',
        );
        appStateManager.setCurrentDeeplink('https://link.metamask.io/send');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('does not carry the push origin past the event it was captured for', () => {
        appStateManager.setCurrentDeeplink('metamask://promo', 'braze');
        appStateManager.setCurrentDeeplink('metamask://promo');
        warmOpen();
        mockEventBuilder.addProperties.mockClear();

        appStateManager.setCurrentDeeplink('https://link.metamask.io/swap');
        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('still clears pendingDeeplinkSource on the untagged delivery', () => {
        appStateManager.setCurrentDeeplink('metamask://promo', 'braze');
        appStateManager.setCurrentDeeplink('metamask://promo');

        expect(appStateManager.pendingDeeplinkSource).toBeNull();
      });
    });

    // Many push payloads carry no deeplink — on-chain activity notifications
    // commonly have no CTA link — so the tap itself is reported directly.
    describe('push tap without a deeplink', () => {
      it('reports push_notification with no deeplink recorded', () => {
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Wallet,
        });

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
          push_provider: 'wallet',
        });
      });

      it('outranks an unrelated deeplink left over from in-app navigation', () => {
        appStateManager.setCurrentDeeplink('metamask://card-home');
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Braze,
        });

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
          push_provider: 'braze',
        });
      });

      it('does not describe the next open after the event consumes it', () => {
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Wallet,
        });
        warmOpen();
        mockEventBuilder.addProperties.mockClear();

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'direct',
        });
      });

      it('reports direct when the tap predates the attribution window', () => {
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Wallet,
        });
        jest.advanceTimersByTime(6000);

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'direct',
        });
      });
    });

    describe('push provider and notification classification', () => {
      it('includes the notification type and subtype for wallet pushes', () => {
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Wallet,
          notificationType: 'platform',
          notificationSubtype: 'eth_received',
        });

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
          push_provider: 'wallet',
          notification_type: 'platform',
          notification_subtype: 'eth_received',
        });
      });

      // Braze payloads carry no equivalent, so the props are omitted rather
      // than sent empty.
      it('omits type and subtype for Braze pushes', () => {
        appStateManager.markOpenedFromPush({
          provider: AppOpenedPushProvider.Braze,
        });

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
          push_provider: 'braze',
        });
      });

      it('omits the provider for a push-tagged deeplink with no reported tap', () => {
        appStateManager.setCurrentDeeplink('metamask://promo', 'braze');

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'push_notification',
        });
      });
    });

    // In-app navigation (Rewards CTAs) also reaches setCurrentDeeplink, and the
    // value survives until an App Opened event consumes it. A leftover must not
    // describe a later resume the user reached from the icon.
    describe('stale deeplink', () => {
      it('reports direct when the deeplink predates the attribution window', () => {
        appStateManager.setCurrentDeeplink('metamask://card-home');
        jest.advanceTimersByTime(6000);

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'direct',
        });
      });

      it('reports deeplink when it arrived within the attribution window', () => {
        appStateManager.setCurrentDeeplink('https://link.metamask.io/swap');
        jest.advanceTimersByTime(1000);

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('honors a deeplink recorded exactly at the window boundary', () => {
        appStateManager.setCurrentDeeplink('https://link.metamask.io/swap');
        // warmOpen() advances a further 2000ms, landing on exactly 5000ms.
        jest.advanceTimersByTime(3000);

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'deeplink',
        });
      });

      it('applies the window to push origins too', () => {
        appStateManager.setCurrentDeeplink('metamask://promo', 'braze');
        jest.advanceTimersByTime(6000);

        warmOpen();

        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          type: 'warm_start',
          source: 'direct',
        });
      });
    });
  });
});
