import { AppState, AppStateStatus } from 'react-native';
import { Store } from 'redux';
import { RootState } from '../reducers';
import Logger from '../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from './Analytics';
import { processAttribution } from './processAttribution';
import DevLogger from './SDKConnect/utils/DevLogger';

export class AppStateEventListener {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener>;
  private currentDeeplink: string | null = null;
  private lastAppState: AppStateStatus = AppState.currentState;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private store: Store<RootState, any> | undefined;

  constructor() {
    this.lastAppState = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  init(store: Store) {
    if(this.store) {
      Logger.error(new Error('store is already initialized'));
      throw new Error('store is already initialized');
    }
    this.store = store;
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
    if (!this.store) {
      Logger.error(new Error('store is not initialized'));
      return;
    }

    try {
      const attributionId = processAttribution({ currentDeeplink: this.currentDeeplink, store: this.store });
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

export const AppStateEventProcessor = new AppStateEventListener();
