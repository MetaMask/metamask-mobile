import { createClient } from '@segment/analytics-react-native';
import DefaultPreference from 'react-native-default-preference';
import { ANALYTICS_EVENTS_V2 } from '../../util/analyticsV2';
import Logger from '../../util/Logger';
import {
  METRICS_OPT_IN,
  AGREED,
  DENIED,
  ANALYTICS_DATA_DELETION_TASK_ID,
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
} from '../../constants/storage';

enum STATES {
  enabled = 'ENABLED',
  disabled = 'DISABLED',
}

interface IAnalytics {
  enable(): void;
  disable(): void;
  trackEvent(): void;
}

class Analytics implements IAnalytics {
  private static _instance: Analytics;

  segmentClient;

  state: STATES = STATES.disabled;

  dataDeletionTaskDate: string | undefined;

  isDataRecorded = false;

  private constructor() {
    this.segmentClient = createClient({
      writeKey: (__DEV__
        ? process.env.SEGMENT_DEV_KEY
        : process.env.SEGMENT_PROD_KEY) as string,
      debug: __DEV__,
    });

    this.state = STATES.enabled;
  }

  private _trackEvent() {
    // eslint-disable-next-line no-console
    console.log('trackEvent');
  }

  private __storeMetricsOptInPreference = async () => {
    try {
      await DefaultPreference.set(
        METRICS_OPT_IN,
        this.state === STATES.enabled ? AGREED : DENIED,
      );
    } catch (e: any) {
      const errorMsg = 'Error storing Metrics OptIn flag in user preferences';
      Logger.error(e, errorMsg);
    }
  };

  public static getInstance(): Analytics {
    if (!Analytics._instance) {
      Analytics._instance = new Analytics();
    }
    return Analytics._instance;
  }

  public enable() {
    this.state = STATES.enabled;
  }

  public disable() {
    this.state = STATES.disabled;
  }

  public trackEvent() {
    this._trackEvent();
  }
}

export default Analytics.getInstance();
