import { createClient } from '@segment/analytics-react-native';
import { ANALYTICS_EVENTS_V2 } from '../../util/analyticsV2';

interface IAnalytics {
  enable(): void;
  disable(): void;
  trackEvent(): void;
}

class Analytics implements IAnalytics {
  private static _instance: Analytics;

  segmentClient;

  enabled: boolean;

  private constructor() {
    this.segmentClient = createClient({
      writeKey: (__DEV__
        ? process.env.SEGMENT_DEV_KEY
        : process.env.SEGMENT_PROD_KEY) as string,
    });

    this.enabled = true;
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
    this.enabled = true;
  }

  public disable() {
    this.enabled = false;
  }

  public trackEvent() {
    this._trackEvent();
  }
}

export default Analytics.getInstance();
