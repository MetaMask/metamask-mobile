import { createClient } from '@segment/analytics-react-native';
import axios from 'axios';
import DefaultPreference from 'react-native-default-preference';
import { bufferToHex, keccak } from 'ethereumjs-util';
import Logger from '../../util/Logger';
import {
  AGREED,
  DENIED,
  METRICS_OPT_IN,
  METAMETRICS_ID,
  ANALYTICS_DATA_DELETION_TASK_ID,
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  SEGMENT_REGULATIONS_ENDPOINT,
} from '../../constants/storage';

import { IMetaMetrics } from './MetaMetrics.interface';
import { METAMETRICS_ANONYMOUS_ID, States } from './MetaMetrics.constants';

class MetaMetrics implements IMetaMetrics {
  private static _instance: MetaMetrics;

  // PRIVATE CLASS VARIABLES

  #metametricsId = '';
  #segmentClient: any;
  #state: States = States.disabled;
  #suppressWithDeleteRegulationDate = '';
  #isDataRecorded = false;

  // CONSTRUCTOR

  private constructor(segmentClient: any) {
    this.#segmentClient = segmentClient;
    this.#state = States.enabled;
    this._init();
  }

  // PRIVATE METHODS

  /**
   * Method to initialize private variables async.
   */
  private async _init() {
    this.#metametricsId = await this._generateMetaMetricsId();
    // eslint-disable-next-line no-console
    console.log(this.#metametricsId);
  }

  /**
   * Method to generate or retrieve the analytics user ID.
   *
   * @returns Promise containing the user ID.
   */
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

  /**
   * Method to associate traits or properties to an user.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
   *
   * @param userId - User ID generated for Segment
   * @param userTraits - Object containing user relevant traits or properties (optional).
   */
  private _identify(userId: string, userTraits?: Record<string, string>): void {
    // The identify method lets you tie a user to their actions
    // and record traits about them. This includes a unique user ID
    // and any optional traits you know about them
    this.#segmentClient.identify(userId, userTraits);
  }

  /**
   * Method to associate an user to a specific group.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#group
   *
   * @param groupId - Group ID to associate user
   * @param groupTraits - Object containing group relevant traits or properties (optional).
   */
  private _group(groupId: string, groupTraits?: Record<string, string>): void {
    //The Group method lets you associate an individual user with a group—
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
  private _trackEvent(
    event: string,
    anonymously: boolean,
    properties?: Record<string, string>,
  ): void {
    if (anonymously) {
      this.#segmentClient.track(
        `Anonymous Test Event: ${event}`,
        properties ?? {},
        undefined,
        METAMETRICS_ANONYMOUS_ID,
      );
    }
    // The Track method lets you record the actions your users perform.
    // Every action triggers an event, which also has associated properties
    // that the track method records.
    this.#segmentClient.track(
      `Test Event: ${event}`,
      properties ?? {},
      this.#metametricsId,
      METAMETRICS_ANONYMOUS_ID,
    );
  }

  /**
   * Method to update the user analytics preference and
   * store it in DefaultPreference.
   */
  private _storeMetricsOptInPreference = async () => {
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
   * a request to create a suppress with delete regulation
   * was created in DefaultPreference.
   */
  private _storeSuppressWithDeleteRegulationCreationDate =
    async (): Promise<void> => {
      const currentDate = new Date();
      const month = currentDate.getUTCMonth() + 1;
      const day = currentDate.getUTCDate();
      const year = currentDate.getUTCFullYear();

      this.#suppressWithDeleteRegulationDate = `${day}/${month}/${year}`;
      await DefaultPreference.set(
        ANALYTICS_DATA_DELETION_DATE,
        this.#suppressWithDeleteRegulationDate,
      );
    };

  /**
   * Method to generate a new suppress and delete regulation for an user.
   * This is necessary to respect the GDPR and CCPA regulations.
   * Check Segment documentation for more information.
   * https://segment.com/docs/privacy/user-deletion-and-suppression/
   */
  private _createSuppressWithDeleteRegulation = async (): Promise<void> => {
    const segmentToken = process.env.MM_MIXPANEL_TOKEN;
    const regulationType = 'Suppress_With_Delete';
    try {
      const response = await axios({
        url: SEGMENT_REGULATIONS_ENDPOINT,
        method: 'post',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${segmentToken}`,
        },
        data: JSON.stringify({
          regulation_type: regulationType,
          attributes: {
            name: this.#metametricsId,
            values: [],
          },
        }),
      });

      await this._storeSuppressWithDeleteRegulationCreationDate();
      // eslint-disable-next-line no-console
      console.log(response.data);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  // PUBLIC METHODS

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

  public enable(): void {
    this.#state = States.enabled;
    this._storeMetricsOptInPreference();
  }

  public disable(): void {
    this.#state = States.disabled;
    this._storeMetricsOptInPreference();
  }

  public state(): States {
    return this.#state;
  }

  public identity(userId: string, userTraits?: Record<string, string>): void {
    this._identify(userId, userTraits);
  }

  public group(groupId: string, groupTraits?: Record<string, string>): void {
    this._group(groupId, groupTraits);
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

  public createSuppressWithDeleteRegulation(): void {
    this._createSuppressWithDeleteRegulation();
  }
}

export default MetaMetrics.getInstance();
