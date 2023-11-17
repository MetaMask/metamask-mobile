import {
  createClient,
  GroupTraits,
  JsonMap,
  UserTraits,
} from '@segment/analytics-react-native';
import axios from 'axios';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import {
  AGREED,
  ANALYTICS_DATA_DELETION_DATE,
  DENIED,
  METAMETRICS_ID,
  METAMETRICS_SEGMENT_REGULATION_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';

import {
  DataDeleteResponseStatus,
  IMetaMetrics,
  ISegmentClient,
} from './MetaMetrics.types';
import {
  METAMETRICS_ANONYMOUS_ID,
  SEGMENT_REGULATIONS_ENDPOINT,
} from './MetaMetrics.constants';
import { v4 as uuidv4 } from 'uuid';
import { bufferToHex, keccak } from 'ethereumjs-util';

/**
 * MetaMetrics using Segment as the analytics provider.
 *
 *
 * ## Base tracking usage
 * ```
 * const metrics = await MetaMetrics.getInstance();
 * metrics.trackEvent('event_name', { property: 'value' });
 * ```
 *
 * ## Enabling MetaMetrics
 * Enable the metrics when user agrees (optin or settings).
 * ```
 * const metrics = await MetaMetrics.getInstance();
 * await metrics.enable();
 *```
 *
 * ## Disabling MetaMetrics
 * Disable the metrics when user refuses (optout or settings).
 * ```
 * const metrics = await MetaMetrics.getInstance();
 * await metrics.enable(false);
 * ```
 *
 * ## Identify user
 * By default all metrics are anonymous using a single hardcoded anonymous ID.
 * Until you identify the user, all events will be associated to this anonymous ID.
 * ```
 * const metrics = await MetaMetrics.getInstance();
 * metrics.addTraitsToUser({ property: 'value' });
 * ```
 *
 * This will associate the user to a new generated unique ID and all future events will be associated to this user.
 *
 * ## Reset user
 * If you want to reset the user ID, you can call the reset method.
 * This will revert the user to the anonymous ID and generate a new unique ID.
 * ```
 * const metrics = await MetaMetrics.getInstance();
 * metrics.reset();
 * ```
 *
 * @see METAMETRICS_ANONYMOUS_ID
 */
class MetaMetrics implements IMetaMetrics {
  // Singleton instance
  protected static instance: MetaMetrics | null;

  private metametricsId: string | undefined;
  private segmentClient: ISegmentClient | undefined;
  private enabled = false; // default to disabled

  constructor(segmentClient: ISegmentClient) {
    this.segmentClient = segmentClient;
  }

  /**
   * retrieve state of metrics from the preference.
   * Defaults to disabled if not explicitely enabled.
   *
   * @returns Promise containing the enabled state.
   */
  #isMetaMetricsEnabled = async (): Promise<boolean> => {
    const enabledPref = await DefaultPreference.get(METRICS_OPT_IN);
    this.enabled = AGREED === enabledPref;
    if (__DEV__)
      Logger.log(`Current MetaMatrics enable state: ${this.enabled}`);
    return this.enabled;
  };

  /**
   * retrieve the analytics user ID.
   * Generates a new one if none is found.
   *
   * @returns Promise containing the user ID.
   */
  #getMetaMetricsId = async (): Promise<string> => {
    // Important: this ID is used to identify the user in Segment and should be kept in
    // preferences: no reset unless explicitelu asked for.
    // If user later anables MetaMetrics,
    // this same ID should be retrieved from preferences and reused.

    // look for a legacy ID from MixPanel integration and use it
    this.metametricsId = await DefaultPreference.get(MIXPANEL_METAMETRICS_ID);
    if (this.metametricsId) {
      await DefaultPreference.set(METAMETRICS_ID, this.metametricsId);
      return this.metametricsId;
    }

    // look for a new Metametics ID and use it or generate a new one
    this.metametricsId = await DefaultPreference.get(METAMETRICS_ID);
    if (!this.metametricsId) {
      // keep the id format compatible with MixPanel but base it on a UUIDv4
      this.metametricsId = bufferToHex(keccak(uuidv4()));
      await DefaultPreference.set(METAMETRICS_ID, this.metametricsId);
    }

    if (__DEV__) Logger.log(`Current MetaMatrics ID: ${this.metametricsId}`);
    return this.metametricsId;
  };

  /**
   * reset the analytics user ID and Sgment SDK state.
   */
  #resetMetaMetricsId = async (): Promise<void> => {
    await DefaultPreference.set(METAMETRICS_ID, '');
    this.metametricsId = await this.#getMetaMetricsId();
  };

  /**
   * associate traits or properties to an user.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
   *
   * Here we we only take traits as parameter as we want to keep the user ID controlled by the class.
   *
   * @param userTraits - Object containing user relevant traits or properties (optional).
   */
  #identify = async (userTraits: UserTraits): Promise<void> => {
    this.segmentClient?.identify(this.metametricsId, userTraits);
  };

  /**
   * associate a user to a specific group.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#group
   *
   * @param groupId - Group ID to associate user
   * @param groupTraits - Object containing group relevant traits or properties (optional).
   */
  #group = (groupId: string, groupTraits?: GroupTraits): void => {
    this.segmentClient?.group(groupId, groupTraits);
  };

  /**
   * track an analytics event.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#track
   *
   * @param event - Analytics event name.
   * @param anonymously - Boolean indicating if the event should be anonymous.
   * @param properties - Object containing any event relevant traits or properties (optional).
   */
  #trackEvent = (event: string, properties: JsonMap): void =>
    this.segmentClient?.track(event, properties);

  /**
   * clear the internal state of the library for the current user and group.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#reset
   */
  #reset = (): void => {
    this.segmentClient?.reset(true);
  };

  /**
   * update the user analytics preference and
   * store in DefaultPreference.
   */
  #storeMetricsOptInPreference = async (enabled: boolean) => {
    try {
      await DefaultPreference.set(METRICS_OPT_IN, enabled ? AGREED : DENIED);
    } catch (e: any) {
      const errorMsg = 'Error storing Metrics OptIn flag in user preferences';
      Logger.error(e, errorMsg);
    }
  };

  /**
   * store the "request to create a delete regulation" creation date
   */
  #storeDeleteRegulationCreationDate = async (): Promise<void> => {
    const currentDate = new Date();
    await DefaultPreference.set(
      ANALYTICS_DATA_DELETION_DATE,
      `${
        currentDate.getUTCMonth() + 1
      }/${currentDate.getUTCDate()}/${currentDate.getUTCFullYear()}`,
    );
  };

  /**
   * store Segment's Regulation ID.
   *
   * @param regulationId - Segment's Regulation ID.
   */
  #storeDeleteRegulationId = async (regulationId: string): Promise<void> => {
    await DefaultPreference.set(
      METAMETRICS_SEGMENT_REGULATION_ID,
      regulationId,
    );
  };

  /**
   * generate a new delete regulation for the user.
   * This is necessary to respect the GDPR and CCPA regulations.
   * Check Segment documentation for more information.
   * https://segment.com/docs/privacy/user-deletion-and-suppression/
   */
  #createSegmentDeleteRegulation = async (): Promise<{
    status: string;
    error?: string;
  }> => {
    const segmentToken = process.env.SEGMENT_DELETION_API_KEY;
    const regulationType = 'DELETE_ONLY';
    try {
      const response = await axios({
        url: SEGMENT_REGULATIONS_ENDPOINT,
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.segment.v1alpha+json',
          Authorization: `Bearer ${segmentToken}`,
        },
        data: JSON.stringify({
          regulationType,
          subjectType: 'USER_ID',
          subjectIds: [this.metametricsId],
        }),
      });
      const { data, status } = response as any;

      if (status === 200) {
        const { regulateId } = data;
        await this.#storeDeleteRegulationId(regulateId);
        await this.#storeDeleteRegulationCreationDate();
        return { status: DataDeleteResponseStatus.ok };
      }

      return { status: DataDeleteResponseStatus.error };
    } catch (error: any) {
      Logger.error(error, 'Analytics Deletion Task Error');
      return { status: DataDeleteResponseStatus.error, error };
    }
  };

  /**
   * get an instance of the MetaMetrics system
   * @returns Promise containing the MetaMetrics instance.
   * Await this method to ensure the instance is ready.
   * ```
   * const metrics = await MetaMetrics.getInstance();
   * ```
   */
  public static async getInstance(): Promise<IMetaMetrics> {
    if (!this.instance) {
      const config = {
        writeKey: (__DEV__
          ? process.env.SEGMENT_DEV_WRITE_KEY
          : process.env.SEGMENT_PROD_WRITE_KEY) as string,
        debug: __DEV__,
        proxy: __DEV__
          ? process.env.SEGMENT_DEV_PROXY_URL
          : process.env.SEGMENT_PROD_PROXY_URL,
        anonymousId: METAMETRICS_ANONYMOUS_ID,
      };
      this.instance = new MetaMetrics(createClient(config));
      // get the user metrics preference when initializing
      this.instance.enabled = await this.instance.#isMetaMetricsEnabled();
      // get the user unique id when initializing
      this.instance.metametricsId = await this.instance.#getMetaMetricsId();
    }
    return this.instance;
  }

  /**
   * enable or disable MetaMetrics
   * @param enable - Boolean indicating if MetaMetrics should be enabled or disabled.
   */
  enable = async (enable = true): Promise<void> => {
    this.enabled = enable;
    await this.#storeMetricsOptInPreference(this.enabled);
  };

  /**
   * check if MetaMetrics is enabled
   * @returns Boolean indicating if MetaMetrics is enabled or disabled.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * add traits to the user and identify them
   * @param userTraits
   */
  addTraitsToUser = (userTraits: UserTraits): Promise<void> => {
    if (this.enabled) {
      return this.#identify(userTraits);
    }
    return Promise.resolve();
  };

  /**
   * add an user to a specific group
   * @param groupId
   * @param groupTraits
   */
  group = (groupId: string, groupTraits?: GroupTraits): Promise<void> => {
    if (this.enabled) {
      this.#group(groupId, groupTraits);
    }
    return Promise.resolve();
  };

  /**
   * track an anonymous event
   *
   * This will track the event twice: once with the anonymous ID and once with the user ID.
   * The anynomous has properties set so you can know what but not who.
   * The non-anonymous has no properties so you can know who but not what.
   *
   * @param event
   * @param properties
   */
  trackAnonymousEvent(event: string, properties: JsonMap = {}): void {
    if (this.enabled) {
      this.#trackEvent(event, { anonymous: true, ...properties });
      this.#trackEvent(event, { anonymous: true });
    }
  }

  /**
   * track an event - the regular way
   * @param event
   * @param properties
   */
  trackEvent = (event: string, properties: JsonMap = {}): void => {
    if (this.enabled) {
      this.#trackEvent(event, { anonymous: false, ...properties });
    }
  };

  /**
   * clear the internal state of the library for the current user and reset the user ID.
   */
  reset = async (): Promise<void> => {
    this.#reset();
    await this.#resetMetaMetricsId();
  };

  /**
   * forces the Segment SDK to flush all events in the queue.
   * This will send all events to Segment without waiting for the queue to be full or the timeout to be reached.
   */
  flush = async (): Promise<void> => this.segmentClient?.flush();

  /**
   * create a new delete regulation for the user.
   * This is necessary to respect the GDPR and CCPA regulations.
   * Check Segment documentation for more information.
   * https://segment.com/docs/privacy/user-deletion-and-suppression/
   * @returns Promise containing the status of the request.
   * Await this method to ensure the request is completed.
   */
  createSegmentDeleteRegulation = async (): Promise<{
    status: string;
    error?: string;
  }> => this.#createSegmentDeleteRegulation();
}

export default MetaMetrics;
