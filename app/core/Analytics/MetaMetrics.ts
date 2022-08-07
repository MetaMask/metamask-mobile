import { createClient } from '@segment/analytics-react-native';
import DefaultPreference from 'react-native-default-preference';
import { bufferToHex, keccak } from 'ethereumjs-util';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';
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

import {
  IMetaMetrics,
  SegmentEventPayload,
  MetaMetricsContext,
} from './interface';
import { METAMETRICS_ANONYMOUS_ID, States } from './constants';

class MetaMetrics implements IMetaMetrics {
  private static _instance: MetaMetrics;

  #metametricsId = '';
  #segmentClient: any;
  #state: States = States.disabled;
  #dataDeletionTaskDate: string | undefined;
  #isDataRecorded = false;

  #appName = '';
  #appVersion = '';
  #buildNumber = '';

  private constructor(segmentClient: any) {
    this.#segmentClient = segmentClient;
    this.#state = States.enabled;
    this._init();
  }

  private async _init() {
    this.#metametricsId = await this._generateMetaMetricsId();
    this.#appName = await getApplicationName();
    this.#appVersion = await getVersion();
    this.#buildNumber = await getBuildNumber();
    // eslint-disable-next-line no-console
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
    if (__DEV__) Logger.log(`Current MetaMatrics ID: ${metametricsId}`);
    return metametricsId;
  }

  private _identify(userId: string, userTraits?: Record<string, string>): void {
    this.#segmentClient.identify(userId, userTraits);
  }

  private _generateMetaMetricsContext(): MetaMetricsContext {
    return {
      app: {
        name: this.#appName,
        version: this.#appVersion,
        build: this.#buildNumber,
      },
    };
  }

  private _validatePayload(payload: SegmentEventPayload): boolean {
    return true;
  }

  private _trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Record<string, string>,
  ): void {
    // const metaMetricsContext = this._generateMetaMetricsContext();
    // const payload: SegmentEventPayload = {
    //   event,
    //   metaMetricsContext,
    //   properties: properties ?? {},
    // };
    // if (anonymously) {
    //   this.#segmentClient.identify(METAMETRICS_ANONYMOUS_ID, {
    //     user: 'TestUser',
    //     appVersion: this.#appVersion,
    //     appName: this.#appName,
    //   });
    // } else {
    // this.#segmentClient.identify(this.#metametricsId, {
    //   appVersion: this.#appVersion,
    //   appName: this.#appName,
    // });
    // }
    if (anonymously) {
      this.#segmentClient.track(
        'Now it should work for real with anon IDs',
        properties ?? {},
        undefined,
        METAMETRICS_ANONYMOUS_ID,
      );
    }
    this.#segmentClient.track(
      'Now it should work for real with non anon ID',
      properties ?? {},
      this.#metametricsId,
      METAMETRICS_ANONYMOUS_ID,
    );
  }

  private __storeMetricsOptInPreference = async () => {
    try {
      await DefaultPreference.set(
        METRICS_OPT_IN,
        this.#state === States.enabled ? AGREED : DENIED,
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
    this.#state = States.enabled;
  }

  public disable() {
    this.#state = States.disabled;
  }

  public identity(userId: string, userTraits?: Record<string, string>): void {
    this._identify(userId, userTraits);
  }

  public trackEvent(
    event: string,
    anonymously = false,
    properties?: Record<string, string>,
  ): void {
    if (this.#state === States.enabled) {
      this._trackEvent(event, anonymously, properties);
    }
  }
}

export default MetaMetrics.getInstance();
