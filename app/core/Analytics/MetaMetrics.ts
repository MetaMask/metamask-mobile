import { GroupTraits, UserTraits } from '@segment/analytics-react-native';
import axios, { AxiosHeaderValue } from 'axios';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';
import {
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  METAMETRICS_DELETION_REGULATION_ID,
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
  ITrackingEvent,
} from './MetaMetrics.types';
import { isE2E } from '../../util/test/utils';
import MetaMetricsTestUtils from './MetaMetricsTestUtils';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';

/**
 * MetaMetrics wrapper around AnalyticsController.
 *
 * This class provides backward compatibility with the IMetaMetrics interface
 * while delegating all analytics operations to AnalyticsController via the analytics.ts utility.
 *
 * @deprecated Use {@link analytics} from `app/util/analytics/analytics` instead. This class is maintained for backward compatibility only.
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
 * @remarks Use {@link analytics} from `app/util/analytics/analytics` for new code. Prefer {@link useMetrics} hook in your components.
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
   */
  protected constructor() {
    // No-op: MetaMetrics now delegates to analytics.ts utility
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
   * indicates if MetaMetrics is initialised and ready to use
   *
   * @private
   */
  #isConfigured = false;

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
          subjectIds: [await analytics.getAnalyticsId()],
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
      this.instance = new MetaMetrics();
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
      // Load data deletion related state (still needed for data deletion methods)
      this.deleteRegulationId = await this.#getDeleteRegulationIdFromPrefs();
      this.deleteRegulationDate =
        await this.#getDeleteRegulationDateFromPrefs();
      this.dataRecorded = await this.#getIsDataRecordedFromPrefs();

      // Note: Privacy plugin is now added in platform-adapter during AnalyticsController initialization
      // User identification is now handled in analytics-controller-init.ts
      // No need to add it here anymore

      this.#isConfigured = true;
    } catch (error: unknown) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Error initializing MetaMetrics',
      );
    }
    return this.#isConfigured;
  };

  /**
   * Enable or disable MetaMetrics
   *
   * @param enable - Boolean indicating if MetaMetrics should be enabled or disabled
   * @deprecated Use {@link analytics.optIn} or {@link analytics.optOut} from `app/util/analytics/analytics` instead
   */
  enable = async (enable = true): Promise<void> => {
    if (enable) {
      await analytics.optIn();
    } else {
      await analytics.optOut();
    }
  };

  /**
   * Check if MetaMetrics is enabled
   *
   * @returns Boolean indicating if MetaMetrics is enabled or disabled
   * @deprecated Use {@link analytics.isEnabled} from `app/util/analytics/analytics` instead
   */
  isEnabled = (): boolean => analytics.isEnabled();

  /**
   * Add traits to the user and identify them
   *
   * @param userTraits list of traits to add to the user
   *
   * @remarks method can be called multiple times,
   * new traits are sent with the underlying identification call to Segment
   * and user traits are updated with the latest ones
   * @deprecated Use {@link analytics.identify} from `app/util/analytics/analytics` instead
   */
  addTraitsToUser = (userTraits: UserTraits): Promise<void> => {
    if (analytics.isEnabled()) {
      // UserTraits from Segment SDK is compatible with AnalyticsUserTraits
      analytics.identify(
        userTraits as unknown as import('@metamask/analytics-controller').AnalyticsUserTraits,
      );
    }
    return Promise.resolve();
  };

  /**
   * Add a user to a specific group
   *
   * @param groupId - Any unique string to associate user with
   * @param groupTraits - group relevant traits or properties (optional)
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  group = (_groupId: string, _groupTraits?: GroupTraits): Promise<void> =>
    // Deprecated method - no-op
    Promise.resolve();

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
   * @deprecated Use {@link analytics.trackEvent} from `app/util/analytics/analytics` instead. Prefer using {@link useMetrics} hook in components.
   */
  trackEvent = (
    // New signature
    event: ITrackingEvent,
    saveDataRecording: boolean = true,
  ): void => {
    if (!analytics.isEnabled()) {
      return;
    }

    if (isE2E) {
      MetaMetricsTestUtils.getInstance().trackEvent(event);
      return;
    }

    // Convert ITrackingEvent to AnalyticsTrackingEvent format
    const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
      .setSaveDataRecording(saveDataRecording)
      .build();

    // Delegate to analytics utility
    analytics.trackEvent(analyticsEvent);

    // Handle data recording flag if needed
    if (saveDataRecording && !this.dataRecorded) {
      this.#setIsDataRecorded(true).catch((error) => {
        // here we don't want to handle the error, there's nothing we can do
        // so we just catch and log it async and do not await for return
        // as this must not block the event tracking
        Logger.error(error, 'Analytics Data Record Error');
      });
    }
  };

  /**
   * Clear the internal state of the library for the current user and reset the user ID
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  reset = async (): Promise<void> => {
    // Deprecated method - no-op
    // Note: AnalyticsController handles user reset through its own methods
  };

  /**
   * Forces the Segment SDK to flush all events in the queue
   *
   * This will send all events to Segment without waiting for
   * the queue to be full or the timeout to be reached
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  flush = async (): Promise<void> => {
    // Deprecated method - no-op
    // Note: AnalyticsController handles event flushing through platform adapter
  };

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
   * Update the data recording flag if needed
   *
   * This method should be called after tracking events to ensure
   * the data recording flag is properly updated for data deletion workflows.
   *
   * @param saveDataRecording - Whether to save the data recording flag (default: true)
   * @deprecated This method will be removed when the data recording flag logic is migrated out of MetaMetrics as part of the MetaMetrics removal migration.
   */
  updateDataRecordingFlag = (saveDataRecording: boolean = true): void => {
    if (saveDataRecording && !this.dataRecorded) {
      this.#setIsDataRecorded(true).catch((error) => {
        // here we don't want to handle the error, there's nothing we can do
        // so we just catch and log it async and do not await for return
        // as this must not block the event tracking
        Logger.error(error, 'Analytics Data Record Error');
      });
    }
  };

  /**
   * Get the current MetaMetrics ID
   *
   * @returns the current MetaMetrics ID
   * @deprecated Use {@link analytics.getAnalyticsId} from `app/util/analytics/analytics` instead
   */
  getMetaMetricsId = async (): Promise<string> =>
    await analytics.getAnalyticsId();
}

export default MetaMetrics;
