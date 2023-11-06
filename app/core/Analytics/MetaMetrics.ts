import {
  createClient,
  JsonMap,
  UserTraits,
  GroupTraits,
} from '@segment/analytics-react-native';
import axios from 'axios';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import {
  AGREED,
  DENIED,
  METRICS_OPT_IN,
  METAMETRICS_ID,
  ANALYTICS_DATA_DELETION_DATE,
  METAMETRICS_SEGMENT_REGULATION_ID,
} from '../../constants/storage';

import {
  IMetaMetrics,
  ISegmentClient,
  DataDeleteResponseStatus,
} from './MetaMetrics.types';
import {
  METAMETRICS_ANONYMOUS_ID,
  SEGMENT_REGULATIONS_ENDPOINT,
} from './MetaMetrics.constants';
import { generateMetametricsId } from '../../util/metrics';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MetaMetrics implements IMetaMetrics {
  // Singleton instance
  static #instance: MetaMetrics;

  #metametricsId: string | undefined;
  #segmentClient: ISegmentClient;
  #enabled: boolean = false;

  constructor(segmentClient: ISegmentClient) {
    this.#segmentClient = segmentClient;
    // get the user metrics preference when initializing the class
    this.#isMetaMetricsEnabled()
      .then((enabled) => (this.#enabled = enabled))
      .catch(async (e) => {
        await Logger.error(e, 'Error getting MetaMetrics user preference');
      });
    // get the user unique id when initializing the class
    this.#getMetaMetricsId()
      .then((id) => (this.#metametricsId = id))
      .catch(async (e) => {
        await Logger.error(e, 'Error getting MetaMetrics ID');
      });
  }

  /**
   * retrieve state of metrics from the preference.
   * Defaults to disabled if not explicitely enabled.
   *
   * @returns Promise containing the enabled state.
   */
  #isMetaMetricsEnabled = async (): Promise<boolean> => {
    this.#enabled = AGREED === (await DefaultPreference.get(METRICS_OPT_IN));
    if (__DEV__)
      Logger.log(`Current MetaMatrics enable state: ${this.#enabled}`);
    return this.#enabled;
  };

  /**
   * retrieve the analytics user ID.
   * Generates a new one if none is found.
   *
   * @returns Promise containing the user ID.
   */
  #getMetaMetricsId = async (): Promise<string> => {
    // Important: this ID is used to identify the user in Segment and should be kept in
    // preferences: no reset. If user later anables MetaMetrics,
    // this same ID should be retrieved from preferences and reused.
    this.#metametricsId = await DefaultPreference.get(METAMETRICS_ID);
    if (!this.#metametricsId) {
      this.#metametricsId = generateMetametricsId();
      await DefaultPreference.set(METAMETRICS_ID, this.#metametricsId);
    }
    if (__DEV__) Logger.log(`Current MetaMatrics ID: ${this.#metametricsId}`);
    return this.#metametricsId;
  };

  /**
   * associate traits or properties to an user.
   * Check Segment documentation for more information.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
   *
   * @param userTraits - Object containing user relevant traits or properties (optional).
   */
  #identify = (userTraits: UserTraits): void => {
    this.#segmentClient.identify(this.#metametricsId, userTraits);
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
    this.#segmentClient.group(groupId, groupTraits);
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
  #trackEvent = (
    event: string,
    anonymously: boolean,
    properties: JsonMap,
  ): void => {
    if (anonymously) {
      // If the tracking is anonymous, do not send user specific ID
      // use the default METAMETRICS_ANONYMOUS_ID.
      this.#segmentClient.track(
        event,
        properties,
        undefined,
        METAMETRICS_ANONYMOUS_ID,
      );
    } else {
      this.#segmentClient.track(
        event,
        properties,
        this.#metametricsId,
        METAMETRICS_ANONYMOUS_ID,
      );
    }
  };

  /**
   * Method to clear the internal state of the library for the current user and group.
   * https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#reset
   */
  #reset = (): void => {
    // TODO - check if this is the correct way to reset the user and if we have to also reset when non anonyous ID is available
    this.#segmentClient.reset(METAMETRICS_ANONYMOUS_ID);
  };

  /**
   * update the user analytics preference and
   * store in DefaultPreference.
   */
  #storeMetricsOptInPreference = async () => {
    try {
      await DefaultPreference.set(
        METRICS_OPT_IN,
        this.#enabled ? AGREED : DENIED,
      );
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
    const month = currentDate.getUTCMonth() + 1;
    const day = currentDate.getUTCDate();
    const year = currentDate.getUTCFullYear();

    // store with format: DAY/MONTH/YEAR
    await DefaultPreference.set(
      ANALYTICS_DATA_DELETION_DATE,
      `${day}/${month}/${year}`,
    );
  };

  /**
   * store segment's Regulation ID.
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
   * generate a new delete regulation for an user.
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

  static getInstance(client?: any): IMetaMetrics {
    if (!MetaMetrics.#instance) {
      // This central client manages all the tracking events
      if (!client) {
        const segmentClient = createClient({
          writeKey: (__DEV__
            ? process.env.SEGMENT_DEV_KEY
            : process.env.SEGMENT_PROD_KEY) as string,
          debug: __DEV__,
          proxy: __DEV__
            ? process.env.SEGMENT_DEV_PROXY_KEY
            : process.env.SEGMENT_PROD_PROXY_KEY,
        });
        client = segmentClient;
      }
      MetaMetrics.#instance = new MetaMetrics(client);
    }
    return MetaMetrics.#instance;
  }

  enable(enable: boolean): void {
    this.#enabled = enable;
    this.#storeMetricsOptInPreference();
  }

  isEnabled(): boolean {
    return this.#enabled;
  }

  addTraitsToUser(userTraits: UserTraits): void {
    this.#identify(userTraits);
  }

  group(groupId: string, groupTraits?: GroupTraits): void {
    this.#group(groupId, groupTraits);
  }

  trackAnonymousEvent(event: string, properties: JsonMap = {}): void {
    if (this.#enabled) {
      this.#trackEvent(event, true, properties);
      this.#trackEvent(event, false, {});
    }
  }

  trackEvent(event: string, properties: JsonMap = {}): void {
    if (this.#enabled) {
      this.#trackEvent(event, false, properties);
    }
  }

  reset(): void {
    this.#reset();
  }

  createSegmentDeleteRegulation = (): Promise<{
    status: string;
    error?: string;
  }> => this.#createSegmentDeleteRegulation();
}

let instance: IMetaMetrics;

export default {
  /**
   * Initializes the MetaMetrics instance.
   * @param client - Segment client instance.
   */
  init: (client: ISegmentClient) => {
    if (!instance) {
      instance = MetaMetrics.getInstance(client);
    }
    return instance;
  },
  enable: (enable: boolean = true) => {
    instance?.enable(enable);
  },
  trackEvent: (event: string, properties: JsonMap = {}) => {
    instance?.trackEvent(event, properties);
  },
  trackAnonymousEvent: (event: string, properties: JsonMap = {}) =>
    instance?.trackAnonymousEvent(event, properties),
  group: (groupId: string, groupTraits?: GroupTraits) => {
    instance?.group(groupId, groupTraits);
  },
  reset: () => {
    instance?.reset();
  },
  createSegmentDeleteRegulation: () => {
    instance?.createSegmentDeleteRegulation();
  },
  addTraitsToUser: (userTraits: UserTraits) => {
    instance?.addTraitsToUser(userTraits);
  },
};
