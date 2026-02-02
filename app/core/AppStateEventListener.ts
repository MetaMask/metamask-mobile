import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import { processAttribution } from './processAttribution';
import DevLogger from './SDKConnect/utils/DevLogger';
import ReduxService from './redux';
import generateDeviceAnalyticsMetaData from '../util/metrics';
import generateUserSettingsAnalyticsMetaData from '../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';

export class AppStateEventListener {
  private appStateSubscription:
    | ReturnType<typeof AppState.addEventListener>
    | undefined = undefined;
  // TODO: The AppStateEventListener should be feature agnostic and shouldn't include deeplinks. Abstract this into a deeplink service instead
  public currentDeeplink: string | null = null;
  public pendingDeeplink: string | null = null;
  public pendingDeeplinkSource: string | null = null;
  private lastAppState: AppStateStatus = AppState.currentState;

  constructor() {
    this.lastAppState = AppState.currentState;
  }

  start() {
    if (this.appStateSubscription) {
      // Already started
      return;
    }
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    // Identify user on app launch
    // This ensures user is identified with full traits including chain_id_list when the app starts
    this.identifyUserOnAppStart();
  }

  public setCurrentDeeplink(deeplink: string | null, source?: string) {
    this.currentDeeplink = deeplink;
    this.pendingDeeplink = deeplink;
    this.pendingDeeplinkSource = source ?? null;
  }

  public clearPendingDeeplink() {
    this.pendingDeeplink = null;
    this.pendingDeeplinkSource = null;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && this.lastAppState !== nextAppState) {
      // delay to allow time for the deeplink to be set
      setTimeout(() => {
        this.processAppStateChange();
      }, 2000);
    }
    this.lastAppState = nextAppState;
  };

  private identifyUserOnAppStart = () => {
    try {
      // Identify user with full traits on app start
      // This ensures all traits including chain_id_list are sent on initial launch
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      analytics.identify(consolidatedTraits);
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateManager: Error identifying user on app start',
      );
    }
  };

  private processAppStateChange = () => {
    try {
      const attribution = processAttribution({
        currentDeeplink: this.currentDeeplink,
        store: ReduxService.store,
      });
      // Note: User identification is handled when settings change individually
      // We only track the APP_OPENED event on app state transitions
      const appOpenedEventBuilder = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.APP_OPENED,
      ).setSaveDataRecording(true);
      if (attribution) {
        const { attributionId, ...utmParams } = attribution;
        DevLogger.log(
          `AppStateManager:: processAppStateChange:: sending event 'APP_OPENED' attributionId=${attribution.attributionId}`,
          utmParams,
        );
        appOpenedEventBuilder.addProperties(attribution);
      }
      analytics.trackEvent(appOpenedEventBuilder.build());
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateManager: Error processing app state change',
      );
    }
  };

  public cleanup() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = undefined;
  }
}

export const AppStateEventProcessor = new AppStateEventListener();
