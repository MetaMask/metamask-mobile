import {
  MetaMetricsProvider,
  Category,
  Params,
} from './MetaMetricsProvider.type';
import { createClient, SegmentClient } from '@segment/analytics-react-native';
import Logger from '../../util/Logger';
import { METAMETRICS_ANONYMOUS_ID } from './MetaMetrics.constants';

const DEFAULT_ANONYMOUS_PARAM = true;

export default class MetaMetricsProviderSegmentImpl
  implements MetaMetricsProvider
{
  static instance: MetaMetricsProvider;
  #segmentClient: SegmentClient;

  /**
   * Builds the instance of the SegmentClient.
   *
   * Uses the Segment write key from the environment variables
   * depending on whether the app is running in dev or prod.
   */
  constructor() {
    this.#segmentClient = createClient({
      writeKey: (__DEV__
        ? process.env.SEGMENT_DEV_KEY
        : process.env.SEGMENT_PROD_KEY) as string,
      debug: __DEV__,
      proxy: (__DEV__
        ? process.env.SEGMENT_DEV_PROXY_KEY
        : process.env.SEGMENT_PROD_PROXY_KEY) as string,
    });

    // this.#segmentClient.identify(METAMETRICS_ANONYMOUS_ID);
    this.#segmentClient.flush();
  }

  /**
   * Returns the singleton instance of the MetaMetricsProvider.
   *
   * Prevents multiple instances of the MetaMetricsProvider from being created.
   * and saves memory and processing.
   *
   * @returns {MetaMetricsProvider} The singleton instance of the MetaMetricsProvider.
   */
  static getInstance = (): MetaMetricsProvider => {
    if (!this.instance) {
      this.instance = new MetaMetricsProviderSegmentImpl();
    }
    return this.instance;
  };

  /**
   * Tracks an event with the given name.
   * @param eventName - The name of the event to track.
   * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously. Defaults to true.
   */
  trackEvent = (
    eventName: string,
    anonymously: boolean = DEFAULT_ANONYMOUS_PARAM,
  ): void => {
    // TODO add anonymous tracking logic
    this.#segmentClient
      .track(eventName, {}, METAMETRICS_ANONYMOUS_ID, METAMETRICS_ANONYMOUS_ID)
      .then(() => {
        this.#segmentClient.flush();
      })
      .catch((error) => {
        this.#segmentClient.flush();
      });
  };

  /**
   * Tracks an event with the given name and parameters.
   * @param eventName - The name of the event to track.
   * @param params - The parameters of the event to track.
   * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
   */
  trackEventWithParameters(
    eventName: string | Category,
    params?: Params,
    anonymously: boolean = DEFAULT_ANONYMOUS_PARAM,
  ): void {
    Logger.log(`trackEvent ${eventName} ${params} ${anonymously}`);
  }
}
