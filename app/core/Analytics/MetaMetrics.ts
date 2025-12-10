import {
  createClient,
  GroupTraits,
  JsonMap,
  UserTraits,
  CountFlushPolicy,
  TimerFlushPolicy,
} from '@segment/analytics-react-native';
import axios, { AxiosHeaderValue } from 'axios';
import StorageWrapper from '../../store/storage-wrapper';
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
  ITrackingEvent,
} from './MetaMetrics.types';
import { v4 as uuidv4, validate, version } from 'uuid';
import { Config } from '@segment/analytics-react-native/lib/typescript/src/types';
import generateDeviceAnalyticsMetaData from '../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import generateUserSettingsAnalyticsMetaData from '../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import { isE2E } from '../../util/test/utils';
import MetaMetricsPrivacySegmentPlugin from './MetaMetricsPrivacySegmentPlugin';
import MetaMetricsTestUtils from './MetaMetricsTestUtils';
import { segmentPersistor } from './SegmentPersistor';
import { isHexAddress } from '@metamask/utils';

/**
 * MetaMetrics using Segment as the analytics provider.
 *
 * ## Configuration
 * Initialize the MetaMetrics system by calling {@link configure} method.
 * This should be done once in the app lifecycle.
 * Ideally in the app entry point.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.configure();
 * ```
 *
 * ## Base tracking usage
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, { property: 'value' });
 * ```
 *
 * or using the new properties structure:
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, {
 *   properties: {property: 'value' },
 *   sensitiveProperties: {sensitiveProperty: 'sensitiveValue' }
 * );
 * ```
 *
 * ## Enabling MetaMetrics
 * Enable the metrics when user agrees (optin or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable();
 *```
 *
 * ## Disabling MetaMetrics
 * Disable the metrics when user refuses (optout or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable(false);
 * ```
 *
 * ## Identify user
 * By default all metrics are anonymous using a single hardcoded anonymous ID.
 * Until you identify the user, all events will be associated to this anonymous ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.addTraitsToUser({ property: 'value' });
 * ```
 *
 * This will associate the user to a new generated unique ID and all future events will be associated to this user.
 *
 * ## Reset user
 * If you want to reset the user ID, you can call the reset method.
 * This will revert the user to the anonymous ID and generate a new unique ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.reset();
 * ```
 * @remarks prefer {@link useMetrics} hook in your components
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
   * indicates if MetaMetrics is initialised and ready to use
   *
   * @private
   */
  #isConfigured = false;

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
    const enabledPref = await StorageWrapper.getItem(METRICS_OPT_IN);
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
    (await StorageWrapper.getItem(ANALYTICS_DATA_RECORDED)) === 'true';

  /**
   * Retrieve the analytics deletion request date from the preference
   * @private
   */
  #getDeleteRegulationDateFromPrefs = async (): Promise<string> =>
    await StorageWrapper.getItem(ANALYTICS_DATA_DELETION_DATE);

  /**
   * Retrieve the analytics deletion regulation ID from the preference
   * @private
   */
  #getDeleteRegulationIdFromPrefs = async (): Promise<string> =>
    await StorageWrapper.getItem(METAMETRICS_DELETION_REGULATION_ID);

  /**
   * Persist the analytics recording status
   * @private
   * @param isDataRecorded - analytics recording status
   */
  #setIsDataRecorded = async (isDataRecorded = false): Promise<void> => {
    this.dataRecorded = isDataRecorded;
    await StorageWrapper.setItem(
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
    await StorageWrapper.setItem(
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
    await StorageWrapper.setItem(ANALYTICS_DATA_DELETION_DATE, deletionDate);
  };

  /**
   * Retrieve the analytics user ID from references
   *
   * Generates a new ID if none is found or if the stored ID is corrupted
   *
   * @returns Promise containing the user ID
   */
  #getMetaMetricsId = async (): Promise<string> => {
    // Important: this ID is used to identify the user in Segment and should be kept in
    // preferences: no reset unless explicitelu asked for.
    // If user later enables MetaMetrics,
    // this same ID should be retrieved from preferences and reused.
    // look for a legacy ID from MixPanel integration and use it
    const legacyId = await StorageWrapper.getItem(MIXPANEL_METAMETRICS_ID);
    if (legacyId && isHexAddress(legacyId.toLowerCase())) {
      this.metametricsId = legacyId;
      await StorageWrapper.setItem(METAMETRICS_ID, legacyId);
      return legacyId;
    }

    // look for a new Metametics ID and use it or generate a new one
    const metametricsId: string | undefined =
      await StorageWrapper.getItem(METAMETRICS_ID);

    // This catches '""', 'null', 'undefined', and other corruptions
    if (
      !metametricsId ||
      !validate(metametricsId) ||
      version(metametricsId) !== 4
    ) {
      if (metametricsId) {
        // Log corruption for monitoring
        Logger.log(
          `MetaMetrics: Corrupted metaMetricsId detected and regenerated. Invalid value: ${metametricsId}`,
        );
      }
      // keep the id format compatible with MixPanel but base it on a UUIDv4
      this.metametricsId = uuidv4();
      await StorageWrapper.setItem(METAMETRICS_ID, this.metametricsId);
    } else {
      this.metametricsId = metametricsId;
    }
    return this.metametricsId;
  };

  /**
   * Reset the analytics user ID and Segment SDK state
   */
  #resetMetaMetricsId = async (): Promise<void> => {
    try {
      await StorageWrapper.setItem(METAMETRICS_ID, '');
      this.metametricsId = await this.#getMetaMetricsId();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Logger.error(error, 'Error resetting MetaMetrics ID');
    }
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
   * Send an analytics event to the Segment SDK track function
   *
   * @param event - Analytics event name
   * @param properties - Object containing any event relevant traits or properties (optional)
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#track
   */
  #trackWithSdkClient = (
    event: string,
    properties: JsonMap,
    saveDataRecording = true,
  ): void => {
    this.segmentClient?.track(event, properties);
    saveDataRecording &&
      !this.dataRecorded &&
      this.#setIsDataRecorded(true).catch((error) => {
        // here we don't want to handle the error, there's nothing we can do
        // so we just catch and log it async and do not await for return
        // as this must not block the event tracking
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
   * store in StorageWrapper
   *
   * @param enabled - Boolean indicating if opts-in ({@link AGREED}) or opts-out ({@link DENIED})
   */
  #storeMetricsOptInPreference = async (enabled: boolean) => {
    try {
      await StorageWrapper.setItem(METRICS_OPT_IN, enabled ? AGREED : DENIED);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Logger.error(error, 'Error storing MetaMetrics enable state');
    }
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
    const segmentRegulationEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;

    if (!segmentSourceId || !segmentRegulationEndpoint) {
      return {
        status: DataDeleteResponseStatus.error,
        error: 'Segment API source ID or endpoint not found',
      };
    }

    const regulationType = 'DELETE_ONLY';

    try {
      const response = await axios({
        url: `${segmentRegulationEndpoint}/regulations/sources/${segmentSourceId}`,
        method: 'POST',
        headers: this.#getSegmentApiHeaders(),
        data: JSON.stringify({
          regulationType,
          subjectType: 'USER_ID',
          subjectIds: [this.metametricsId],
        }),
      });
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = response as any;

      await this.#setDeleteRegulationId(data?.data?.regulateId);
      await this.#setDeleteRegulationCreationDate(); // set to current date
      await this.#setIsDataRecorded(false); // indicate no data recorded since request

      return { status: DataDeleteResponseStatus.ok };
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const segmentRegulationEndpoint =
        process.env.SEGMENT_REGULATIONS_ENDPOINT;

      if (!this.deleteRegulationId || !segmentRegulationEndpoint) {
        return {
          status: DataDeleteResponseStatus.error,
          dataDeleteStatus: DataDeleteStatus.unknown,
        };
      }

      try {
        const response = await axios({
          url: `${segmentRegulationEndpoint}/regulations/${this.deleteRegulationId}`,
          method: 'GET',
          headers: this.#getSegmentApiHeaders(),
        });

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = response as any;
        const status = data?.data?.regulation?.overallStatus;

        return {
          status: DataDeleteResponseStatus.ok,
          dataDeleteStatus: status || DataDeleteStatus.unknown,
        };
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   * @example const metrics = MetaMetrics.getInstance();
   * @returns non configured MetaMetrics instance
   * @remarks Instance has to be configured before being used, call {@link configure} method asynchrounously
   */
  public static getInstance(): IMetaMetrics {
    if (!this.instance) {
      const config: Config = {
        writeKey: process.env.SEGMENT_WRITE_KEY as string,
        proxy: process.env.SEGMENT_PROXY_URL as string,
        debug: __DEV__,
        // Use custom persistor to bridge Segment SDK with app's storage system
        storePersistor: segmentPersistor,
        // Use flush policies for better control and to avoid timeout issues
        // CountFlushPolicy: triggers when reaching a certain number of events
        // TimerFlushPolicy: triggers on an interval (expects milliseconds)
        // Environment variables are in seconds for backward compatibility
        // Both are configurable via environment variables in .js.env
        // If not set, sensible defaults are used (20 events, 30 seconds)
        flushPolicies: [
          new CountFlushPolicy(
            parseInt(process.env.SEGMENT_FLUSH_EVENT_LIMIT || '20', 10),
          ),
          new TimerFlushPolicy(
            parseInt(process.env.SEGMENT_FLUSH_INTERVAL || '30', 10) * 1000,
          ),
        ],
      };

      if (__DEV__)
        Logger.log(
          `MetaMetrics client configured with: ${JSON.stringify(
            config,
            null,
            2,
          )}`,
        );

      /*
      E2E tests hang when segment is enabled see: https://github.com/MetaMask/metamask-mobile/pull/9791
      So we need to mock the Segment client when running E2E tests
      */
      const segmentClient = isE2E
        ? {
            track: () => Promise.resolve(),
            identify: () => Promise.resolve(),
            group: () => Promise.resolve(),
            screen: () => Promise.resolve(),
            flush: () => Promise.resolve(),
            reset: () => Promise.resolve(),
            add: () => Promise.resolve(),
          }
        : createClient(config);

      this.instance = new MetaMetrics(segmentClient as ISegmentClient);
    }
    return this.instance;
  }

  /**
   * Configure MetaMetrics system
   *
   * @example
   * const metrics = MetaMetrics.getInstance();
   * await metrics.configure() && metrics.enable();
   *
   * @remarks Instance has to be configured before being used
   * Calling configure multiple times will not configure the instance again
   *
   * @returns Promise indicating if MetaMetrics configuration was successful or not
   */
  configure = async (): Promise<boolean> => {
    if (this.#isConfigured) return true;
    try {
      this.enabled = await this.#isMetaMetricsEnabled();
      // get the user unique id when initializing
      this.metametricsId = await this.#getMetaMetricsId();
      this.deleteRegulationId = await this.#getDeleteRegulationIdFromPrefs();
      this.deleteRegulationDate =
        await this.#getDeleteRegulationDateFromPrefs();
      this.dataRecorded = await this.#getIsDataRecordedFromPrefs();

      this.segmentClient?.add({
        plugin: new MetaMetricsPrivacySegmentPlugin(this.metametricsId),
      });

      this.#isConfigured = true;

      // identify user with the latest traits
      // run only after the MetaMetrics is configured
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      await this.addTraitsToUser(consolidatedTraits);

      if (__DEV__)
        Logger.log(`MetaMetrics configured with ID: ${this.metametricsId}`);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Logger.error(error, 'Error initializing MetaMetrics');
    }
    return this.#isConfigured;
  };

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
  isEnabled = () => this.enabled;

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
    if (this.isEnabled()) {
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
    if (this.isEnabled()) {
      this.#group(groupId, groupTraits);
    }
    return Promise.resolve();
  };

  /**
   * Track an event
   *
   * The function allows to track non-anonymous and anonymous events:
   * - with properties and without properties,
   * - with a unique trackEvent function
   *
   * ## Regular non-anonymous events
   * Regular events are tracked with the user ID and can have properties set
   *
   * ## Anonymous events
   * Anonymous tracking track sends two events: one with the anonymous ID and one with the user ID
   * - The anonymous event includes sensitive properties so you can know **what** but not **who**
   * - The non-anonymous event has either no properties or not sensitive one so you can know **who** but not **what**
   *
   * @example prefer using the hook {@link useMetrics} in your components
   * const { trackEvent, createEventBuilder } = useMetrics();
   *
   * @example basic non-anonymous tracking with no properties:
   * trackEvent(createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED).build());
   *
   * @example track with non-anonymous properties:
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addProperties({ normalProp: 'value' })
   *  .build());
   *
   * @example track an anonymous event with properties
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addSensitiveProperties({ sensitiveProp: 'value' })
   *  .build());
   *
   * @example track an event with both anonymous and non-anonymous properties
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addProperties({ normalProp: 'value' })
   *  .addSensitiveProperties({ sensitiveProp: 'value' })
   *  .build());
   *
   * @param event - Analytics event built with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent = (
    // New signature
    event: ITrackingEvent,
    saveDataRecording: boolean = true,
  ): void => {
    if (!this.isEnabled()) {
      return;
    }

    if (isE2E) {
      MetaMetricsTestUtils.getInstance().trackEvent(event);
      return;
    }

    // if event does not have properties, only send the non-anonymous empty event
    // and return to prevent any additional processing
    if (!event.hasProperties) {
      this.#trackWithSdkClient(
        event.name,
        { anonymous: false },
        saveDataRecording,
      );
      return;
    }

    // Log all non-anonymous properties, or an empty event if there's no non-anon props.
    // In any case, there's a non-anon event tracked, see MetaMetrics.test.ts Tracking table.
    this.#trackWithSdkClient(
      event.name,
      { anonymous: false, ...event.properties },
      saveDataRecording,
    );

    // Track all anonymous properties in an anonymous event
    if (event.isAnonymous) {
      this.#trackWithSdkClient(
        event.name,
        {
          anonymous: true,
          ...event.properties,
          ...event.sensitiveProperties,
        },
        saveDataRecording,
      );
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
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  isDataRecorded = () => this.dataRecorded;

  /**
   * Get the current MetaMetrics ID
   *
   * @returns the current MetaMetrics ID
   */
  getMetaMetricsId = async (): Promise<string> =>
    this.metametricsId ?? (await this.#getMetaMetricsId());
}

export default MetaMetrics;
