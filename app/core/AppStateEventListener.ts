import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';
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
  }

  public setCurrentDeeplink(deeplink: string | null) {
    this.currentDeeplink = deeplink;
    this.pendingDeeplink = deeplink;
  }

  public clearPendingDeeplink() {
    this.pendingDeeplink = null;
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

  private processAppStateChange = () => {
    try {
      const attribution = processAttribution({
        currentDeeplink: this.currentDeeplink,
        store: ReduxService.store,
      });
      const metrics = MetaMetrics.getInstance();
      // identify user with the latest traits
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      metrics.addTraitsToUser(consolidatedTraits).catch((error) => {
        Logger.error(
          error as Error,
          'AppStateManager: Error adding traits to user',
        );
      });
      const appOpenedEventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.APP_OPENED,
      );
      if (attribution) {
        const { attributionId, ...utmParams } = attribution;
        DevLogger.log(
          `AppStateManager:: processAppStateChange:: sending event 'APP_OPENED' attributionId=${attribution.attributionId}`,
          utmParams,
        );
        appOpenedEventBuilder.addProperties({ ...attribution });
      }
      metrics.trackEvent(appOpenedEventBuilder.build());
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
