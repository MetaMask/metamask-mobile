import { createClient } from '@segment/analytics-react-native';
import DefaultPreference from 'react-native-default-preference';
import { bufferToHex, keccak } from 'ethereumjs-util';
import { ANALYTICS_EVENTS_V2 } from '../../util/analyticsV2';
import Logger from '../../util/Logger';
import {
  AGREED,
  DENIED,
  METRICS_OPT_IN,
  METAMETRICS_ID,
  ANALYTICS_DATA_DELETION_TASK_ID,
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
} from '../../constants/storage';

enum STATES {
  enabled = 'ENABLED',
  disabled = 'DISABLED',
}

interface IMetaMetrics {
  enable(): void;
  disable(): void;
  trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Map<string, string>,
  ): void;
}

const ANON_ID = '0x0000000000000000';

class MetaMetrics implements IMetaMetrics {
  private static _instance: MetaMetrics;

  #metametricsId = '';
  #segmentClient: any;
  #state: STATES = STATES.disabled;
  #dataDeletionTaskDate: string | undefined;
  #isDataRecorded = false;

  private constructor(segmentClient: any) {
    this.#segmentClient = segmentClient;
    this.#state = STATES.enabled;
    this.__init();
  }

  private async __init() {
    this.#metametricsId = await this._generateMetaMetricsId();
    this._identify(this.#metametricsId);
    console.log(this.#metametricsId);
  }

  private async _generateMetaMetricsId(): Promise<string> {
    let metametricsId: string;
    metametricsId = await DefaultPreference.get(METAMETRICS_ID);
    if (!metametricsId) {
      metametricsId = bufferToHex(
        keccak(
          Buffer.from(
            String(Date.now()) +
              String(Math.round(Math.random() * Number.MAX_SAFE_INTEGER)),
          ),
        ),
      );
      await DefaultPreference.set(METAMETRICS_ID, metametricsId);
    }
    return metametricsId;
  }

  private _identify(userId: string, userTraits?: Map<string, string>): void {
    this.#segmentClient.identify(userId, userTraits);
  }

  private _trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Map<string, string>,
  ): void {
    if (anonymously) {
      this.__trackEventAnonymously(event, properties);
    } else {
      this.#segmentClient.track(event, properties);
    }
  }

  private __trackEventAnonymously(
    event: string,
    properties?: Map<string, string>,
  ): void {
    this._identify(ANON_ID);
    this.#segmentClient.track(event, properties);
  }

  private __storeMetricsOptInPreference = async () => {
    try {
      await DefaultPreference.set(
        METRICS_OPT_IN,
        this.#state === STATES.enabled ? AGREED : DENIED,
      );
    } catch (e: any) {
      const errorMsg = 'Error storing Metrics OptIn flag in user preferences';
      Logger.error(e, errorMsg);
    }
  };

  public static getInstance(): IMetaMetrics {
    if (!MetaMetrics._instance) {
      const segmentClient = createClient({
        writeKey: (__DEV__
          ? process.env.SEGMENT_DEV_KEY
          : process.env.SEGMENT_PROD_KEY) as string,
        debug: __DEV__,
      });
      MetaMetrics._instance = new MetaMetrics(segmentClient);
    }
    return MetaMetrics._instance;
  }

  public enable() {
    this.#state = STATES.enabled;
  }

  public disable() {
    this.#state = STATES.disabled;
  }

  public identity(userId: string, userTraits?: Map<string, string>): void {
    this._identify(userId, userTraits);
  }

  public trackEvent(
    event: string,
    anonymously = false,
    properties?: Map<string, string>,
  ): void {
    if (this.#state === STATES.enabled) {
      this._trackEvent(event, anonymously, properties);
    }
  }
}

export default MetaMetrics.getInstance();
