import { AppState, AppStateStatus } from 'react-native';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { processAttribution } from './processAttribution';
import DevLogger from './SDKConnect/utils/DevLogger';

class AppStateEventListener {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener>;
  private currentDeeplink: string | null = null;
  private lastAppState: AppStateStatus = AppState.currentState;

  constructor() {
    this.lastAppState = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  public setCurrentDeeplink(deeplink: string | null) {
    this.currentDeeplink = deeplink;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      nextAppState === 'active' &&
      this.lastAppState !== nextAppState
    ) {
      // delay to allow time for the deeplink to be set
      setTimeout(() => {
        this.processAppStateChange();
      }, 2000);
    }
    this.lastAppState = nextAppState;
  };

  private processAppStateChange = () => {
    try {
      const attributionId = processAttribution(this.currentDeeplink);
      DevLogger.log(`AppStateManager:: processAppStateChange:: sending event 'APP_OPENED' attributionId=${attributionId}`);
      MetaMetrics.getInstance().trackEvent(
        MetaMetricsEvents.APP_OPENED,
        { attributionId },
        true
      );
    } catch (error) {
      Logger.error(error as Error, 'AppStateManager: Error processing app state change');
    }
  };

  public cleanup() {
    this.appStateSubscription.remove();
  }
}

export default AppStateEventListener;
