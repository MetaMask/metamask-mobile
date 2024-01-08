import {
  createClient,
  GroupTraits,
  JsonMap,
  UserTraits,
} from '@segment/analytics-react-native';
import axios, { AxiosHeaderValue } from 'axios';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import {
  AGREED,
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  DENIED,
  METAMETRICS_ID,
  METAMETRICS_DELETION_REGULATION_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';

import {
  DataDeleteDate,
  DataDeleteRegulationId,
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IDeleteRegulationStatusResponse,
  IMetaMetrics,
  ISegmentClient,
} from './MetaMetrics.types';
import {
  METAMETRICS_ANONYMOUS_ID,
  SEGMENT_REGULATIONS_ENDPOINT,
} from './MetaMetrics.constants';
import { v4 as uuidv4 } from 'uuid';

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
  /**
   * Protected constructor to prevent direct instantiation
   *
   * Use {@link getInstance} instead
   *
   * @protected
   * @param segmentClient - Segment client instance
   */
  protected constructor(segmentClient: ISegmentClient) {
    this.segmentClient = segmentClient;
  }

  /**
   * Singleton instance of the MetaMetrics class
   *
   * The value is protected to prevent direct access
   * but allows to access it from a child class for testing
   * @protected
   */
  protected static instance: MetaMetrics | null;

  /**
   * Segment SDK client instance
   *
   * The MetaMetrics class is a wrapper around the Segment SDK
   * @private
   */
  private segmentClient: ISegmentClient | undefined;

  /**
   * Random ID used for tracking events
   *
   * ID stored in the device and is used to identify the events
   * It's generated when the user enables MetaMetrics for the first time
   * @private
   */
  private metametricsId: string | undefined;

  /**
   * Indicate if MetaMetrics is enabled or disabled
   *
   * MetaMetrics is disabled by default, user has to explicitly opt-in
   * @private
   */
  private enabled = false;

  /**
   * Indicate if data has been recorded since the last deletion request
   * @private
   */
  private dataRecorded = false;

  /**
   * Segment's data deletion regulation ID
   *
   * The ID returned by the Segment delete API
   * which allows to check the status of the deletion request
   * @private
   */
  private deleteRegulationId: DataDeleteRegulationId;

  /**
   * Segment's data deletion regulation creation date
   *
   * The date when the deletion request was created
   * @private
   */
  private deleteRegulationDate: DataDeleteDate;

  /**
   * Retrieve state of metrics from the preference
   *
   * Defaults to disabled if not explicitely enabled
   * @private
   * @returns Promise containing the enabled state
   */
  #isMetaMetricsEnabled = async (): Promise<boolean> => {
    const enabledPref = await DefaultPreference.get(METRICS_OPT_IN);
    this.enabled = AGREED === enabledPref;
    if (__DEV__)
      Logger.log(`Current MetaMatrics enable state: ${this.enabled}`);
    return this.enabled;
  };

  /**
   * Retrieve the analytics recording status from the preference
   * @private
   */
  #getIsDataRecordedFromPrefs = async (): Promise<boolean> =>
    (await DefaultPreference.get(ANALYTICS_DATA_RECORDED)) === 'true';

  /**
   * Retrieve the analytics deletion request date from the preference
   * @private
   */
  #getDeleteRegulationDateFromPrefs = async (): Promise<string> =>
    await DefaultPreference.get(ANALYTICS_DATA_DELETION_DATE);

  /**
   * Retrieve the analytics deletion regulation ID from the preference
   * @private
   */
  #getDeleteRegulationIdFromPrefs = async (): Promise<string> =>
    await DefaultPreference.get(METAMETRICS_DELETION_REGULATION_ID);

  /**
   * Persist the analytics recording status
   * @private
   * @param isDataRecorded - analytics recording status
   */
  #setIsDataRecorded = async (isDataRecorded = false): Promise<void> => {
    this.dataRecorded = isDataRecorded;
    await DefaultPreference.set(
      ANALYTICS_DATA_RECORDED,
      String(isDataRecorded),
    );
  };

  /**
   * Set and store Segment's data deletion regulation ID
   * @private
   * @param deleteRegulationId - data deletion regulation ID returned by Segment
   * delete API or undefined if no regulation in progress
   */
  #setDeleteRegulationId = async (
    deleteRegulationId: string,
  ): Promise<void> => {
    this.deleteRegulationId = deleteRegulationId;
    await DefaultPreference.set(
      METAMETRICS_DELETION_REGULATION_ID,
      deleteRegulationId,
    );
  };

  /**
   * Set and store the delete regulation request creation date
   */
  #setDeleteRegulationCreationDate = async (): Promise<void> => {
    const currentDate = new Date();
    const day = currentDate.getUTCDate();
    const month = currentDate.getUTCMonth() + 1;
    const year = currentDate.getUTCFullYear();

    // format the date in the format DD/MM/YYYY
    const deletionDate = `${day}/${month}/${year}`;

    this.deleteRegulationDate = deletionDate;

    // similar to the one used in the legacy Analytics
    await DefaultPreference.set(ANALYTICS_DATA_DELETION_DATE, deletionDate);
  };

  /**
   * Retrieve the analytics user ID from references
   *
   * Generates a new ID if none is found
   *
   * @returns Promise containing the user ID
   */
  #getMetaMetricsId = async (): Promise<string> => {
    // Important: this ID is used to identify the user in Segment and should be kept in
    // preferences: no reset unless explicitelu asked for.
    // If user later enables MetaMetrics,
    // this same ID should be retrieved from preferences and reused.

    // look for a legacy ID from MixPanel integration and use it
    // this should be kept for backwards compatibility and preserving the user ID
    // in the new metametrics system
    this.metametricsId = await DefaultPreference.get(MIXPANEL_METAMETRICS_ID);
    if (this.metametricsId) {
      await DefaultPreference.set(METAMETRICS_ID, this.metametricsId);
      return this.metametricsId;
    }

    // look for a new Metametics ID and use it or generate a new one
    this.metametricsId = await DefaultPreference.get(METAMETRICS_ID);
    if (!this.metametricsId) {
      // keep the id format compatible with MixPanel but base it on a UUIDv4
      this.metametricsId = uuidv4();
      await DefaultPreference.set(METAMETRICS_ID, this.metametricsId);
    }

    if (__DEV__) Logger.log(`Current MetaMatrics ID: ${this.metametricsId}`);
    return this.metametricsId;
  };

  /**
   * Reset the analytics user ID and Segment SDK state
   */
  #resetMetaMetricsId = async (): Promise<void> => {
    await DefaultPreference.set(METAMETRICS_ID, '');
    this.metametricsId = await this.#getMetaMetricsId();
  };

  /**
   * Associate traits or properties to an user
   *
   * It only takes traits as parameter as we want to keep the user ID controlled by the class
   *
   * @param userTraits - Object containing user relevant traits or properties (optional)
   *
   * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
   */
  #identify = async (userTraits: UserTraits): Promise<void> => {
    this.segmentClient?.identify(this.metametricsId, userTraits);
  };

  /**
   * Associate a user to a specific group
   *
   * @param groupId - Group ID to associate user
   * @param groupTraits - Object containing group relevant traits or properties (optional)
   *
   * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#group
   */
  #group = (groupId: string, groupTraits?: GroupTraits): void => {
    this.segmentClient?.group(groupId, groupTraits);
  };

  /**
   * Track an analytics event
   *
   * @param event - Analytics event name
   * @param properties - Object containing any event relevant traits or properties (optional)
   *
   * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#track
   */
  #trackEvent = (event: string, properties: JsonMap): void => {
    this.segmentClient?.track(event, properties);
    !this.dataRecorded &&
      this.#setIsDataRecorded(true).catch((error) => {
        Logger.error(error, 'Analytics Data Record Error');
      });
  };

  /**
   * Clear the internal state of the library for the current user and group
   *
   * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#reset
   */
  #reset = (): void => {
    this.segmentClient?.reset(true);
  };

  /**
   * Update the user analytics preference and
   * store in DefaultPreference
   *
   * @param enabled - Boolean indicating if opts-in ({@link AGREED}) or opts-out ({@link DENIED})
   */
  #storeMetricsOptInPreference = async (enabled: boolean) => {
    await DefaultPreference.set(METRICS_OPT_IN, enabled ? AGREED : DENIED);
  };

  /**
   * Get the Segment API HTTP headers
   * @private
   */
  #getSegmentApiHeaders = (): { [key: string]: AxiosHeaderValue } => ({
    'Content-Type': 'application/vnd.segment.v1+json',
  });

  /**
   * Generate a new delete regulation for the user
   *
   * This is necessary to respect the GDPR and CCPA regulations
   *
   * @see https://segment.com/docs/privacy/user-deletion-and-suppression/
   */
  #createDataDeletionTask = async (): Promise<IDeleteRegulationResponse> => {
    const segmentSourceId = process.env.SEGMENT_DELETE_API_SOURCE_ID;
    const regulationType = 'DELETE_ONLY';
    try {
      const response = await axios({
        url: `${SEGMENT_REGULATIONS_ENDPOINT}/regulations/sources/${segmentSourceId}`,
        method: 'POST',
        headers: this.#getSegmentApiHeaders(),
        data: JSON.stringify({
          regulationType,
          subjectType: 'USER_ID',
          subjectIds: [this.metametricsId],
        }),
      });
      const { data } = response as any;

      await this.#setDeleteRegulationId(data?.data?.regulateId);
      await this.#setDeleteRegulationCreationDate(); // set to current date
      await this.#setIsDataRecorded(false); // indicate no data recorded since request

      return { status: DataDeleteResponseStatus.ok };
    } catch (error: any) {
      Logger.error(error, 'Analytics Deletion Task Error');
      return {
        status: DataDeleteResponseStatus.error,
        error: 'Analytics Deletion Task Error',
      };
    }
  };

  /**
   * Check a Deletion Task using Segment API
   *
   * @returns promise for Object indicating the status of the deletion request
   * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/getRegulation
   */
  #checkDataDeletionTaskStatus =
    async (): Promise<IDeleteRegulationStatusResponse> => {
      // if no delete regulation id, return unknown status
      // regulation id is set when creating a new delete regulation

      if (!this.deleteRegulationId) {
        return {
          status: DataDeleteResponseStatus.error,
          dataDeleteStatus: DataDeleteStatus.unknown,
        };
      }

      try {
        const response = await axios({
          url: `${SEGMENT_REGULATIONS_ENDPOINT}/regulations/${this.deleteRegulationId}`,
          method: 'GET',
          headers: this.#getSegmentApiHeaders(),
        });

        const { data } = response as any;
        const status = data?.data?.regulation?.overallStatus;

        return {
          status: DataDeleteResponseStatus.ok,
          dataDeleteStatus: status || DataDeleteStatus.unknown,
        };
      } catch (error: any) {
        Logger.error(error, 'Analytics Deletion Task Check Error');
        return {
          status: DataDeleteResponseStatus.error,
          dataDeleteStatus: DataDeleteStatus.unknown,
        };
      }
    };

  /**
   * Get an instance of the MetaMetrics system
   *
   * Await this method to ensure the instance is ready
   *
   * @example const metrics = await MetaMetrics.getInstance();
   * @returns Promise containing the MetaMetrics instance.
   */
  public static async getInstance(): Promise<IMetaMetrics> {
    if (!this.instance) {
      const config = {
        writeKey: process.env.SEGMENT_WRITE_KEY as string,
        proxy: process.env.SEGMENT_PROXY_URL as string,
        debug: __DEV__,
        anonymousId: METAMETRICS_ANONYMOUS_ID,
      };
      this.instance = new MetaMetrics(createClient(config));
      // get the user metrics preference when initializing
      this.instance.enabled = await this.instance.#isMetaMetricsEnabled();
      // get the user unique id when initializing
      this.instance.metametricsId = await this.instance.#getMetaMetricsId();
      this.instance.deleteRegulationId =
        await this.instance.#getDeleteRegulationIdFromPrefs();
      this.instance.deleteRegulationDate =
        await this.instance.#getDeleteRegulationDateFromPrefs();
      this.instance.dataRecorded =
        await this.instance.#getIsDataRecordedFromPrefs();
    }
    return this.instance;
  }

  /**
   * Enable or disable MetaMetrics
   *
   * @param enable - Boolean indicating if MetaMetrics should be enabled or disabled
   */
  enable = async (enable = true): Promise<void> => {
    this.enabled = enable;
    await this.#storeMetricsOptInPreference(this.enabled);
  };

  /**
   * Check if MetaMetrics is enabled
   *
   * @returns Boolean indicating if MetaMetrics is enabled or disabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Add traits to the user and identify them
   *
   * @param userTraits list of traits to add to the user
   *
   * @remarks method can be called multiple times,
   * new traits are sent with the underlying identification call to Segment
   * and user traits are updated with the latest ones
   */
  addTraitsToUser = (userTraits: UserTraits): Promise<void> => {
    if (this.enabled) {
      return this.#identify(userTraits);
    }
    return Promise.resolve();
  };

  /**
   * Add a user to a specific group
   *
   * @param groupId - Any unique string to associate user with
   * @param groupTraits - group relevant traits or properties (optional)
   */
  group = (groupId: string, groupTraits?: GroupTraits): Promise<void> => {
    if (this.enabled) {
      this.#group(groupId, groupTraits);
    }
    return Promise.resolve();
  };

  /**
   * Track an anonymous event
   *
   * This will track the event twice: once with the anonymous ID and once with the user ID
   *
   * - The anynomous event has properties set so you can know *what* but not *who*
   * - The non-anonymous event has no properties so you can know *who* but not *what*
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
   * Track an event - the regular way
   *
   * @param event
   * @param properties
   */
  trackEvent = (event: string, properties: JsonMap = {}): void => {
    if (this.enabled) {
      this.#trackEvent(event, { anonymous: false, ...properties });
    }
  };

  /**
   * Clear the internal state of the library for the current user and reset the user ID
   */
  reset = async (): Promise<void> => {
    this.#reset();
    await this.#resetMetaMetricsId();
  };

  /**
   * Forces the Segment SDK to flush all events in the queue
   *
   * This will send all events to Segment without waiting for
   * the queue to be full or the timeout to be reached
   */
  flush = async (): Promise<void> => this.segmentClient?.flush();

  /**
   * Create a new delete regulation for the user
   *
   * @remarks This is necessary to respect the GDPR and CCPA regulations
   *
   * @returns Promise containing the status of the request
   *
   * @see https://segment.com/docs/privacy/user-deletion-and-suppression/
   * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/createSourceRegulation
   */
  createDataDeletionTask = async (): Promise<IDeleteRegulationResponse> =>
    this.#createDataDeletionTask();

  /**
   * Check the latest delete regulation status
   * @returns Promise containing the date, delete status and collected data flag
   */
  checkDataDeleteStatus = async (): Promise<IDeleteRegulationStatus> => {
    const status: IDeleteRegulationStatus = {
      deletionRequestDate: undefined,
      dataDeletionRequestStatus: DataDeleteStatus.unknown,
      hasCollectedDataSinceDeletionRequest: false,
    };

    if (this.deleteRegulationId) {
      try {
        const dataDeletionTaskStatus =
          await this.#checkDataDeletionTaskStatus();
        status.dataDeletionRequestStatus =
          dataDeletionTaskStatus.dataDeleteStatus;
      } catch (error: any) {
        Logger.log('Error checkDataDeleteStatus -', error);
        status.dataDeletionRequestStatus = DataDeleteStatus.unknown;
      }

      status.deletionRequestDate = this.deleteRegulationDate;
      status.hasCollectedDataSinceDeletionRequest = this.dataRecorded;
    }
    return status;
  };

  /**
   * Get the latest delete regulation request date
   *
   * @returns the date as a DD/MM/YYYY string
   */
  getDeleteRegulationCreationDate = (): string | undefined =>
    this.deleteRegulationDate;

  /**
   * Get the latest delete regulation request id
   *
   * @returns the id string
   */
  getDeleteRegulationId = (): string | undefined => this.deleteRegulationId;

  /**
   * Indicate if events have been recorded since the last deletion request
   *
   * @returns true if events have been recorded since the last deletion request
   */
  isDataRecorded = (): boolean => this.dataRecorded;
}

export default MetaMetrics;
