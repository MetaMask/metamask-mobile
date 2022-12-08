import {
  createClient,
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';
import axios from 'axios';
import DefaultPreference from 'react-native-default-preference';
import { bufferToHex, keccak } from 'ethereumjs-util';
import Logger from '../../util/Logger';
import {
  AGREED,
  DENIED,
  METRICS_OPT_IN,
  METAMETRICS_ID,
  ANALYTICS_DATA_DELETION_DATE,
  MIXPANEL_METAMETRICS_ID,
  METAMETRICS_SEGMENT_REGULATION_ID,
} from '../../constants/storage';

import {
  IMetaMetrics,
  ISegmentClient,
  States,
  DataDeleteResponseStatus,
} from './MetaMetrics.types';
import {
  METAMETRICS_ANONYMOUS_ID,
  SEGMENT_REGULATIONS_ENDPOINT,
} from './MetaMetrics.constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MetaMetrics implements IMetaMetrics {
  static #instance: MetaMetrics;

  // PRIVATE CLASS VARIABLES

  #metametricsId = '';
  #segmentClient: ISegmentClient;
  #state: States = States.disabled;
  #deleteRegulationDate = '';
  #isDataRecorded = false;

  // CONSTRUCTOR

  constructor(segmentClient: any) {
    this.#segmentClient = segmentClient;
    this.#state = States.enabled;
    // this.#init();
  }

  // PRIVATE METHODS

  /**
   * Method to initialize private variables async.
   */
  async #init() {
    this.#metametricsId = await this.#getMetaMetricsId();
  }

  /**
   * Method to generate or retrieve the analytics user ID.
   *
   * @returns Promise containing the user ID.
   */
  async #getMetaMetricsId(): Promise<string> {
    let metametricsId: string | undefined;

    // Legacy ID from MixPanel integration
    metametricsId = await DefaultPreference.get(MIXPANEL_METAMETRICS_ID);
    if (metametricsId && !__DEV__) {
      return metametricsId;
    }

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

  /**
   * Method to associate traits or properties to an user.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
   *
   * @param userId - User ID generated for Segment
   * @param userTraits - Object containing user relevant traits or properties (optional).
   */
  #identify(userTraits: UserTraits): void {
    // The identify method lets you tie a user to their actions
    // and record traits about them. This includes a unique user ID
    // and any optional traits you know about them
    this.#segmentClient.identify(this.#metametricsId, userTraits);
  }

  /**
   * Method to associate an user to a specific group.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#group
   *
   * @param groupId - Group ID to associate user
   * @param groupTraits - Object containing group relevant traits or properties (optional).
   */
  #group(groupId: string, groupTraits?: GroupTraits): void {
    // The Group method lets you associate an individual user with a group—
    // whether it’s a company, organization, account, project, or team.
    // This includes a unique group identifier and any additional
    // group traits you may know
    this.#segmentClient.group(groupId, groupTraits);
  }

  /**
   * Method to track an analytics event.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#track
   *
   * @param event - Analytics event name.
   * @param anonymously - Boolean indicating if the event should be anonymous.
   * @param properties - Object containing any event relevant traits or properties (optional).
   */
  #trackEvent(event: string, anonymously: boolean, properties: JsonMap): void {
    if (anonymously) {
      // If the tracking is anonymous, there should not be a MetaMetrics ID
      // included, MetaMetrics core should use the METAMETRICS_ANONYMOUS_ID
      // instead.
      this.#segmentClient.track(
        event,
        properties,
        undefined,
        METAMETRICS_ANONYMOUS_ID,
      );
    } else {
      // The Track method lets you record the actions your users perform.
      // Every action triggers an event, which also has associated properties
      // that the track method records.
      this.#segmentClient.track(
        event,
        properties,
        this.#metametricsId,
        METAMETRICS_ANONYMOUS_ID,
      );
    }
    this.#isDataRecorded = true;
  }

  /**
   * Method to clear the internal state of the library for the current user and group.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#reset
   */
  #reset(): void {
    this.#segmentClient.reset(METAMETRICS_ANONYMOUS_ID);
  }

  /**
   * Method to update the user analytics preference and
   * store it in DefaultPreference.
   */
  #storeMetricsOptInPreference = async () => {
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

  /**
   * Method to store the date (format: DAY/MONTH/YEAR)
   * a request to create a delete regulation
   * was created in DefaultPreference.
   */
  #storeDeleteRegulationCreationDate = async (): Promise<void> => {
    const currentDate = new Date();
    const month = currentDate.getUTCMonth() + 1;
    const day = currentDate.getUTCDate();
    const year = currentDate.getUTCFullYear();

    this.#deleteRegulationDate = `${day}/${month}/${year}`;
    await DefaultPreference.set(
      ANALYTICS_DATA_DELETION_DATE,
      this.#deleteRegulationDate,
    );
  };

  /**
   * Method to store segment's Regulation ID in DefaultPreference.
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
   * Method to generate a new delete regulation for an user.
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
          subjectIds: [this.#metametricsId],
        }),
      });
      const { result, status } = response as any;

      if (status === '200') {
        const { regulateId } = result.data;
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

  // PUBLIC METHODS

  public static getInstance(): IMetaMetrics {
    if (!MetaMetrics.#instance) {
      // This central client manages all the tracking events
      const segmentClient = createClient({
        writeKey: (__DEV__
          ? process.env.SEGMENT_DEV_KEY
          : process.env.SEGMENT_PROD_KEY) as string,
        debug: __DEV__,
      });
      MetaMetrics.#instance = new MetaMetrics(segmentClient);
    }
    return MetaMetrics.#instance;
  }

  public enable(): void {
    this.#state = States.enabled;
    this.#storeMetricsOptInPreference();
  }

  public disable(): void {
    this.#state = States.disabled;
    this.#storeMetricsOptInPreference();
  }

  public state(): States {
    return this.#state;
  }

  public addTraitsToUser(userTraits: UserTraits): void {
    this.#identify(userTraits);
  }

  public group(groupId: string, groupTraits?: GroupTraits): void {
    this.#group(groupId, groupTraits);
  }

  public trackAnonymousEvent(event: string, properties: JsonMap = {}): void {
    if (this.#state === States.disabled) {
      return;
    }
    this.#trackEvent(event, true, properties);
    this.#trackEvent(event, false, {});
  }

  public trackEvent(event: string, properties: JsonMap = {}): void {
    if (this.#state === States.disabled) {
      return;
    }
    this.#trackEvent(event, false, properties);
  }

  public reset(): void {
    this.#reset();
  }

  public createSegmentDeleteRegulation(): void {
    this.#createSegmentDeleteRegulation();
  }
}

// export default MetaMetrics.getInstance();
