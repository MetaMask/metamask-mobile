import { createClient } from '@segment/analytics-react-native';
import { ANALYTICS_EVENTS_V2 } from '../../util/analyticsV2';

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
    });

    this.state = STATES.enabled;
  }

  public static getInstance(): Analytics {
    if (!Analytics._instance) {
      Analytics._instance = new Analytics();
    }
    return Analytics._instance;
  }

  private _trackEvent() {
    // eslint-disable-next-line no-console
    console.log('trackEvent');
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
