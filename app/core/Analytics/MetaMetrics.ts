import { GroupTraits, UserTraits } from '@segment/analytics-react-native';
import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import axios, { AxiosHeaderValue } from 'axios';
import StorageWrapper from '../../store/storage-wrapper';
import { analytics } from './analytics';
import { whenEngineReady } from './whenEngineReady';
import Logger from '../../util/Logger';
import {
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  METAMETRICS_DELETION_REGULATION_ID,
} from '../../constants/storage';

import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IDeleteRegulationStatusResponse,
  IMetaMetrics,
  ITrackingEvent,
} from './MetaMetrics.types';

/**
 * MetaMetrics using Segment as the analytics provider.
 *
 * @deprecated Use {@link analytics} module instead. This class is kept for backward compatibility
 * and will be removed once all features are migrated to the new analytics module.
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
    // Empty constructor - singleton pattern
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

      const deleteRegulationId = await this.#getDeleteRegulationIdFromPrefs();
      if (!deleteRegulationId || !segmentRegulationEndpoint) {
        return {
          status: DataDeleteResponseStatus.error,
          dataDeleteStatus: DataDeleteStatus.unknown,
        };
      }

      try {
        const response = await axios({
          url: `${segmentRegulationEndpoint}/regulations/${deleteRegulationId}`,
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
   * @deprecated Use {@link analytics} module instead
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
   * @deprecated Use {@link analytics} module instead. No configuration needed.
   *
   * @returns true
   */
  configure = async (): Promise<boolean> =>
    // Kept for backward compatibility
     true
  ;

  /**
   * Enable or disable regular analytics opt-in
   *
   * @deprecated Use {@link analytics.optInForRegularAccount} or {@link analytics.optOutForRegularAccount} instead
   *
   * This method controls the regular analytics opt-in state (not social login opt-in).
   * Use {@link enableSocialLogin} for social login analytics opt-in.
   * The controller computes the final enabled state internally based on both opt-in states.
   *
   * @param enable - Boolean indicating if regular analytics opt-in should be enabled or disabled
   */
  enable = async (enable = true): Promise<void> => {
    try {
      // Ensure messenger is ready so state syncs immediately
      await whenEngineReady();
      if (enable) {
        analytics.optInForRegularAccount();
      } else {
        analytics.optOutForRegularAccount();
      }
    } catch (error) {
      if (__DEV__) {
        Logger.log('Failed to enable/disable via analytics', error);
      }
    }
  };

  /**
   * Enable or disable Social Login Metrics
   *
   * @deprecated Use {@link analytics.optInForSocialAccount} or {@link analytics.optOutForSocialAccount} instead
   *
   * @param isSocialLoginEnabled - Boolean indicating if Social Login Metrics should be enabled or disabled
   */
  enableSocialLogin = async (isSocialLoginEnabled = true): Promise<void> => {
    try {
      if (isSocialLoginEnabled) {
        analytics.optInForSocialAccount();
      } else {
        analytics.optOutForSocialAccount();
      }
    } catch (error) {
      if (__DEV__) {
        Logger.log(
          'Failed to enable/disable social login via analytics',
          error,
        );
      }
    }
  };

  /**
   * Check if MetaMetrics is enabled
   *
   * @deprecated Use {@link analytics.isEnabled} instead (synchronous, same behavior)
   *
   * @returns Boolean indicating if MetaMetrics is enabled or disabled
   */
  isEnabled = (): boolean => analytics.isEnabled();

  /**
   * Add traits to the user and identify them
   *
   * @deprecated Use {@link analytics.identify} instead
   *
   * @param userTraits list of traits to add to the user
   *
   * @remarks method can be called multiple times,
   * new traits are sent with the underlying identification call to Segment
   * and user traits are updated with the latest ones
   */
  addTraitsToUser = (userTraits: UserTraits): Promise<void> => {
    analytics.identify(userTraits as AnalyticsUserTraits);
    return Promise.resolve();
  };

  /**
   * Add a user to a specific group
   *
   * @deprecated Use {@link analytics} module instead. This method is deprecated and never used in production
   *
   * @param _groupId - Any unique string to associate user with
   * @param _groupTraits - group relevant traits or properties (optional)
   */
  group = (_groupId: string, _groupTraits?: GroupTraits): Promise<void> =>
    // Deprecated method - kept as no-op for backward compatibility
    // This method is never used in production code
     Promise.resolve()
  ;

  /**
   * Track an event
   *
   * @deprecated Use {@link analytics.trackEvent} instead.
   *
   * @param event - Analytics event built with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent = (
    // New signature
    event: ITrackingEvent,
    saveDataRecording: boolean = true,
  ): void => {
    // if event does not have properties, only send the non-anonymous empty event
    // and return to prevent any additional processing
    if (!event.hasProperties) {
      analytics.trackEvent(event.name, {
        anonymous: false,
      } as AnalyticsEventProperties);

      // Handle data recording flag (kept for backward compatibility)
      // TODO: Move this to the future analytics privacy controller
      if (saveDataRecording) {
        this.#getIsDataRecordedFromPrefs().then((dataRecorded) => {
          if (!dataRecorded) {
            this.#setIsDataRecorded(true).catch((error) => {
              // here we don't want to handle the error, there's nothing we can do
              // so we just catch and log it async and do not await for return
              // as this must not block the event tracking
              Logger.error(error, 'Analytics Data Record Error');
            });
          }
        });
      }
      return;
    }

    // Log all non-anonymous properties, or an empty event if there's no non-anon props.
    // In any case, there's a non-anon event tracked, see MetaMetrics.test.ts Tracking table.
    analytics.trackEvent(event.name, {
      anonymous: false,
      ...event.properties,
    } as AnalyticsEventProperties);

    // Handle data recording flag (kept for backward compatibility)
    // TODO: Move this to the future analytics privacy controller
    if (saveDataRecording) {
      this.#getIsDataRecordedFromPrefs().then((dataRecorded: boolean) => {
        if (!dataRecorded) {
          this.#setIsDataRecorded(true).catch((error) => {
            // here we don't want to handle the error, there's nothing we can do
            // so we just catch and log it async and do not await for return
            // as this must not block the event tracking
            Logger.error(error, 'Analytics Data Record Error');
          });
        }
      });
    }

    // Track all anonymous properties in an anonymous event
    if (event.isAnonymous) {
      analytics.trackEvent(event.name, {
        anonymous: true,
        ...event.properties,
        ...event.sensitiveProperties,
      } as AnalyticsEventProperties);

      // Handle data recording flag (kept for backward compatibility)
      // TODO: Move this to the future analytics privacy controller
      if (saveDataRecording) {
        this.#getIsDataRecordedFromPrefs().then((dataRecorded) => {
          if (!dataRecorded) {
            this.#setIsDataRecorded(true).catch((error) => {
              // here we don't want to handle the error, there's nothing we can do
              // so we just catch and log it async and do not await for return
              // as this must not block the event tracking
              Logger.error(error, 'Analytics Data Record Error');
            });
          }
        });
      }
    }
  };

  /**
   * Clear the internal state of the library for the current user and reset the user ID
   *
   * @deprecated Use {@link analytics} module instead. This method is deprecated and never used in production
   */
  reset = async (): Promise<void> => {
    // No-op: deprecated method, controller handles reset
  };

  /**
   * Forces the Segment SDK to flush all events in the queue
   *
   * @deprecated Use {@link analytics} module instead. This method is deprecated and never used in production
   *
   * This will send all events to Segment without waiting for
   * the queue to be full or the timeout to be reached
   */
  flush = async (): Promise<void> => {
    // Deprecated method - kept as no-op for backward compatibility
    // This method is never used in production code
  };

  /**
   * Create a new delete regulation for the user
   *
   * @deprecated This feature will be migrated to analytics module in the future
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
   *
   * @deprecated This feature will be migrated to analytics module in the future
   *
   * @returns Promise containing the date, delete status and collected data flag
   */
  checkDataDeleteStatus = async (): Promise<IDeleteRegulationStatus> => {
    const status: IDeleteRegulationStatus = {
      deletionRequestDate: undefined,
      dataDeletionRequestStatus: DataDeleteStatus.unknown,
      hasCollectedDataSinceDeletionRequest: false,
    };

    const deleteRegulationId = await this.#getDeleteRegulationIdFromPrefs();
    if (deleteRegulationId) {
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

      status.deletionRequestDate =
        await this.#getDeleteRegulationDateFromPrefs();
      status.hasCollectedDataSinceDeletionRequest =
        await this.#getIsDataRecordedFromPrefs();
    }
    return status;
  };

  /**
   * Get the latest delete regulation request date
   *
   * @deprecated This feature will be migrated to analytics module in the future
   *
   * @returns the date as a DD/MM/YYYY string
   */
  getDeleteRegulationCreationDate = async (): Promise<string | undefined> =>
    await this.#getDeleteRegulationDateFromPrefs();

  /**
   * Get the latest delete regulation request id
   *
   * @deprecated This feature will be migrated to analytics module in the future
   *
   * @returns the id string
   */
  getDeleteRegulationId = async (): Promise<string | undefined> =>
    await this.#getDeleteRegulationIdFromPrefs();

  /**
   * Indicate if events have been recorded since the last deletion request
   *
   * @deprecated This feature will be migrated to analytics module in the future
   *
   * @returns true if events have been recorded since the last deletion request
   */
  isDataRecorded = async (): Promise<boolean> =>
    await this.#getIsDataRecordedFromPrefs();

  /**
   * Get the current MetaMetrics ID
   *
   * @deprecated Use {@link analytics.getAnalyticsId} instead
   *
   * @returns the current MetaMetrics ID
   */
  getMetaMetricsId = async (): Promise<string> =>
    // Only rely on controller - no fallback logic
     await analytics.getAnalyticsId()
  ;
}

export default MetaMetrics;
