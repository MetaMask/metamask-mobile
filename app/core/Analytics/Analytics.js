'use strict';

import { Appearance, NativeModules } from 'react-native';
import axios from 'axios';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import { MetaMetricsEvents } from '../../core/Analytics';
import { store } from '../../store';
import { MIXPANEL_ENDPOINT_BASE_URL } from '../../constants/urls';
import {
  METRICS_OPT_IN,
  AGREED,
  DENIED,
  ANALYTICS_DATA_DELETION_TASK_ID,
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from './MetaMetrics.types';

const RCTAnalytics = NativeModules.Analytics;

const USER_PROFILE_PROPERTY = {
  ENABLE_OPENSEA_API: 'Enable OpenSea API',
  NFT_AUTODETECTION: 'NFT Autodetection',
  THEME: 'Theme',
  ON: 'ON',
  OFF: 'OFF',
  AUTHENTICATION_TYPE: 'Authentication Type',
  TOKEN_DETECTION: 'token_detection_enable',
  MULTI_ACCOUNT_BALANCE: 'Batch account balance requests',
};

/**
 * Class to handle analytics through the app
 */
class Analytics {
  /**
   * Variables defined in Mixpanel
   */
  remoteVariables = {};

  /**
   * Whether the manager has permission to send analytics
   */
  enabled;

  /**
   * ID from the deletion task
   */
  dataDeletionTaskId;

  /**
   * Date the deletion task was created
   */
  dataDeletionDate;

  /**
   * Boolean that indicates if the trackEvent method was executed
   */
  isDataRecorded;

  /**
   * Persist current Metrics OptIn flag in user preferences datastore
   */
  _storeMetricsOptInPreference = async () => {
    try {
      await DefaultPreference.set(
        METRICS_OPT_IN,
        this.enabled ? AGREED : DENIED,
      );
    } catch (e) {
      Logger.error(e, 'Error storing Metrics OptIn flag in user preferences');
    }
  };

  /**
   * Identify current user to mixpanel people
   */
  _peopleIdentify = () => {
    RCTAnalytics.peopleIdentify();
  };

  /**
   * Set the user profile state for current user to mixpanel
   */
  _setUserProfileProperties = () => {
    const reduxState = store.getState();
    const preferencesController =
      reduxState?.engine?.backgroundState?.PreferencesController;
    const appTheme = reduxState?.user?.appTheme;
    // This will return either "light" or "dark"
    const appThemeStyle =
      appTheme === 'os' ? Appearance.getColorScheme() : appTheme;

    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.ENABLE_OPENSEA_API,
      preferencesController?.openSeaEnabled
        ? USER_PROFILE_PROPERTY.ON
        : USER_PROFILE_PROPERTY.OFF,
    );
    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.NFT_AUTODETECTION,
      preferencesController?.useNftDetection
        ? USER_PROFILE_PROPERTY.ON
        : USER_PROFILE_PROPERTY.OFF,
    );
    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.THEME,
      appThemeStyle,
    );
    // Track token detection toggle
    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.TOKEN_DETECTION,
      preferencesController.useTokenDetection
        ? USER_PROFILE_PROPERTY.ON
        : USER_PROFILE_PROPERTY.OFF,
    );
    // Track multi account balance toggle
    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.MULTI_ACCOUNT_BALANCE,
      preferencesController.isMultiAccountBalancesEnabled
        ? USER_PROFILE_PROPERTY.ON
        : USER_PROFILE_PROPERTY.OFF,
    );
  };

  /**
   * Track event if enabled and not DEV mode
   */
  async _trackEvent(
    name,
    { event, params = {}, value, info, anonymously = false },
  ) {
    const isAnalyticsPreferenceSelectedEvent =
      MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED === event;
    if (!this.enabled && !isAnalyticsPreferenceSelectedEvent) return;
    this._setUserProfileProperties();
    if (!__DEV__) {
      if (!anonymously) {
        RCTAnalytics.trackEvent({
          ...event,
          ...params,
          value,
          info,
        });
      } else {
        RCTAnalytics.trackEventAnonymously({
          ...event,
          ...params,
          value,
          info,
        });
      }

      if (!this.isDataRecorded) {
        this.isDataRecorded = true;
        await DefaultPreference.set(
          ANALYTICS_DATA_DELETION_TASK_ID,
          this.dataDeletionTaskId,
        );

        await DefaultPreference.set(ANALYTICS_DATA_RECORDED, 'true');
      }
    } else {
      Logger.log(`Analytics '${name}' -`, event, params, value, info);
    }
  }

  /**
   * Creates a Deletion Task using MixPanel GDPR API
   * Reference https://developer.mixpanel.com/docs/privacy-security#create-a-deletion-task
   *
   * @param {string} compliance - CCPA or GDPR compliance. Default is GDPR.
   * @returns Object with the response of the request
   *  {
   *    status: ResponseStatus,
   *    error?: string,
   *    DataDeleteStatus?: DataDeleteStatus
   *  }
   */
  async _createDataDeletionTask(compliance) {
    if (__DEV__) {
      // Mock response for DEV env
      Logger.log(
        `Analytics Deletion Task Created for following ${compliance} compliance`,
      );
      return {
        status: DataDeleteResponseStatus.ok,
        DataDeleteStatus: DataDeleteStatus.pending,
      };
    }
    const distinctId = await this.getDistinctId();
    const action = 'data-deletions';
    const token = process.env.MM_MIXPANEL_TOKEN;
    const GDPRToken = process.env.MM_MIXPANEL_GDPR_API_TOKEN;
    const url = `${MIXPANEL_ENDPOINT_BASE_URL}/${action}/v3.0/?token=${token}`;
    try {
      const response = await axios({
        url,
        method: 'post',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${GDPRToken}`,
        },
        data: JSON.stringify({
          distinct_ids: [distinctId],
          compliance_type: compliance,
        }),
      });

      const result = response.data;

      if (result.status === DataDeleteResponseStatus.ok) {
        this.dataDeletionTaskId = result.results.task_id;

        await DefaultPreference.set(
          ANALYTICS_DATA_DELETION_TASK_ID,
          this.dataDeletionTaskId,
        );

        const currentDate = new Date();
        const month = currentDate.getUTCMonth() + 1;
        const day = currentDate.getUTCDate();
        const year = currentDate.getUTCFullYear();

        this.dataDeletionDate = `${day}/${month}/${year}`;
        await DefaultPreference.set(
          ANALYTICS_DATA_DELETION_DATE,
          this.dataDeletionDate,
        );

        this.isDataRecorded = false;
        await DefaultPreference.set(
          ANALYTICS_DATA_RECORDED,
          String(this.isDataRecorded),
        );

        return {
          status: result.status,
          DataDeleteStatus: DataDeleteResponseStatus.pending,
        };
      }
      Logger.log(`Analytics Deletion Task Error - ${result.error}`);
      return { status: response.status, error: result.error };
    } catch (error) {
      Logger.log(`Analytics Deletion Task Error - ${error}`);
      return { status: DataDeleteResponseStatus.error, error };
    }
  }

  /**
   * Creates a Deletion Task using MixPanel GDPR API
   * Reference https://developer.mixpanel.com/docs/privacy-security#check-status-of-a-deletion-task
   *
   * @param {string} compliance - CCPA or GDPR compliance. Default is GDPR.
   * @returns Object with the response of the request
   *  {
   *    status: ResponseStatus,
   *    dataDeleteStatus?: DataDeleteStatus
   *  }
   */
  async _checkStatusDataDeletionTask() {
    if (__DEV__) {
      // Mock response for DEV env
      return {
        status: DataDeleteResponseStatus.ok,
        DataDeleteStatus: DataDeleteStatus.pending,
      };
    }

    if (!this.dataDeletionTaskId) {
      return {
        status: DataDeleteResponseStatus.error,
        dataDeleteStatus: DataDeleteStatus.unknown,
      };
    }

    const action = 'data-deletions';
    const token = process.env.MM_MIXPANEL_TOKEN;
    const GDPRToken = process.env.MM_MIXPANEL_GDPR_API_TOKEN;
    const url = `${MIXPANEL_ENDPOINT_BASE_URL}/${action}/v3.0/${this.dataDeletionTaskId}?token=${token}`;
    const response = await axios({
      url,
      method: 'get',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${GDPRToken}`,
      },
    });

    const { status, results } = response.data;

    if (results.status === DataDeleteResponseStatus.success) {
      this.dataDeletionTaskId = undefined;
      return {
        status: DataDeleteResponseStatus.ok,
        dataDeleteStatus: DataDeleteStatus.success,
      };
    }

    return {
      status,
      DataDeleteStatus: results.status || DataDeleteStatus.unknown,
    };
  }

  /**
   * Creates a Analytics instance
   */
  constructor(
    metricsOptIn,
    dataDeletionTaskId,
    dataDeletionDate,
    isDataRecorded,
  ) {
    if (!Analytics.instance) {
      this.enabled = metricsOptIn === AGREED;
      this.dataDeletionTaskId = dataDeletionTaskId;
      this.dataDeletionDate = dataDeletionDate;
      this.isDataRecorded = isDataRecorded;
      this.listeners = [];
      Analytics.instance = this;
      if (!__DEV__) {
        RCTAnalytics.optIn(this.enabled);
        this._peopleIdentify();
      }
    }
    return Analytics.instance;
  }

  /**
   * Enable analytics
   */
  enable = () => {
    this.enabled = true;
    RCTAnalytics.optIn(this.enabled);
    this._storeMetricsOptInPreference();
  };

  /**
   * Disable analytics
   */
  disable = () => {
    this.enabled = false;
    RCTAnalytics.optIn(this.enabled);
    this._storeMetricsOptInPreference();
  };

  /**
   * Disable analytics for the current class instance
   * It will block sending events internally but it will keep RCTAnalytics enabled until app reload
   */
  disableInstance = () => {
    this.enabled = false;
    this._storeMetricsOptInPreference();
  };

  /**
   * Get current tracking id
   */
  getDistinctId = async () => {
    const id = await RCTAnalytics.getDistinctId();
    return id;
  };

  /**
   * Track event
   *
   * @param {object} event - Object containing event category, action and name
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEvent = (event, anonymously = false) => {
    this._trackEvent('trackEvent', { event });
  };

  /**
   * Apply User Property
   *
   * @param {string} property - A string representing the login method of the user. One of biometrics, device_passcode, remember_me, password, unknown
   */
  applyUserProperty = (property) => {
    switch (property) {
      case AUTHENTICATION_TYPE.BIOMETRIC:
        RCTAnalytics.setUserProfileProperty(
          USER_PROFILE_PROPERTY.AUTHENTICATION_TYPE,
          AUTHENTICATION_TYPE.BIOMETRIC,
        );
        break;
      case AUTHENTICATION_TYPE.PASSCODE:
        RCTAnalytics.setUserProfileProperty(
          USER_PROFILE_PROPERTY.AUTHENTICATION_TYPE,
          AUTHENTICATION_TYPE.PASSCODE,
        );
        break;
      case AUTHENTICATION_TYPE.REMEMBER_ME:
        RCTAnalytics.setUserProfileProperty(
          USER_PROFILE_PROPERTY.AUTHENTICATION_TYPE,
          AUTHENTICATION_TYPE.REMEMBER_ME,
        );
        break;
      case AUTHENTICATION_TYPE.PASSWORD:
        RCTAnalytics.setUserProfileProperty(
          USER_PROFILE_PROPERTY.AUTHENTICATION_TYPE,
          AUTHENTICATION_TYPE.PASSWORD,
        );
        break;
      default:
        RCTAnalytics.setUserProfileProperty(
          USER_PROFILE_PROPERTY.AUTHENTICATION_TYPE,
          AUTHENTICATION_TYPE.UNKOWN,
        );
    }
  };

  /**
   * Track event with value
   *
   * @param {object} event - Object containing event category, action and name
   * @param {number} value - Value number to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithValue = (event, value, anonymously = false) => {
    this._trackEvent('trackEventWithValue', { event, value, anonymously });
  };

  /**
   * Track event with information
   *
   * @param {object} event - Object containing event category, action and name
   * @param {string} info - Information string to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithInfo = (event, info, anonymously = false) => {
    this._trackEvent('trackEventWithInfo', { event, info, anonymously });
  };

  /**
   * Track event with value and information
   *
   * @param {object} event - Object containing event category, action and name
   * @param {number} value - Value number to send with event
   * @param {string} info - Information string to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithValueAndInfo = (event, value, info, anonymously = false) => {
    this._trackEvent('trackEventWithValueAndInfo', {
      event,
      value,
      info,
      anonymously,
    });
  };

  /**
   * Track event with parameters
   *
   * @param {object} event - Object containing event category, action and name
   * @param {object} params - Object containing other params to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithParameters = (event, params, anonymously = false) => {
    this._trackEvent('trackEventWithParameters', {
      event,
      params,
      anonymously,
    });
  };

  /**
   * Track event with value and parameters
   *
   * @param {object} event - Object containing event category, action and name
   * @param {number} value - Value number to send with event
   * @param {object} params - Object containing other params to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithValueAndParameters = (
    event,
    value,
    params,
    anonymously = false,
  ) => {
    this._trackEvent('trackEventWithValueAndParameters', {
      event,
      value,
      params,
      anonymously,
    });
  };

  /**
   * Track event with value and parameters
   *
   * @param {object} event - Object containing event category, action and name
   * @param {number} value - Value number to send with event
   * @param {string} info - Information string to send with event
   * @param {object} params - Object containing other params to send with event
   * @param {boolean} anonymously - Whether the tracking should be without the right distinctId
   */
  trackEventWithValueAndInfoAndParameters = (
    event,
    value,
    info,
    params,
    anonymously = false,
  ) => {
    this._trackEvent('trackEventWithValueAndInfoAndParameters', {
      event,
      value,
      info,
      params,
      anonymously,
    });
  };

  /**
   * Creates a deletion task to delete all data, including events and user profile data, for the user specified by mixpanelUserId
   *
   * @param {string} compliance - CCPA or GDPR compliance
   */
  createDataDeletionTask(compliance = 'GDPR') {
    return this._createDataDeletionTask(compliance);
  }

  checkStatusDataDeletionTask() {
    return this._checkStatusDataDeletionTask();
  }
}

let instance;

export default {
  init: async () => {
    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
    const deleteTaskId = await DefaultPreference.get(
      ANALYTICS_DATA_DELETION_TASK_ID,
    );
    const dataDeletionDate = await DefaultPreference.get(
      ANALYTICS_DATA_DELETION_DATE,
    );
    const metametricsId = await DefaultPreference.get(MIXPANEL_METAMETRICS_ID);
    const isDataRecorded =
      (await DefaultPreference.get(ANALYTICS_DATA_RECORDED)) === 'true';
    instance = new Analytics(
      metricsOptIn,
      deleteTaskId,
      dataDeletionDate,
      isDataRecorded,
    );
    // MixPanel distinctId stored for consistency purposes between
    // Segment and MixPanel
    if (!metametricsId) {
      const distinctId = await instance.getDistinctId();
      DefaultPreference.set(MIXPANEL_METAMETRICS_ID, distinctId);
    }
    try {
      const vars = await RCTAnalytics.getRemoteVariables();
      instance.remoteVariables = JSON.parse(vars);
    } catch (e) {
      // Do nothing
    }
    return instance;
  },
  enable() {
    return instance && instance.enable();
  },
  disable() {
    return instance && instance.disable();
  },
  disableInstance() {
    return instance && instance.disableInstance();
  },
  checkEnabled() {
    return instance && instance.enabled;
  },
  getDistinctId() {
    return instance && instance.getDistinctId();
  },
  getDeletionTaskId() {
    return instance && instance.dataDeletionTaskId;
  },
  getDeletionTaskDate() {
    return instance && instance.dataDeletionDate;
  },
  getIsDataRecorded() {
    return instance && instance.isDataRecorded;
  },
  trackEvent(event, anonymously) {
    return instance && instance.trackEvent(event, anonymously);
  },
  applyUserProperty(property) {
    return instance && instance.applyUserProperty(property);
  },
  trackEventWithParameters(event, parameters, anonymously) {
    return (
      instance &&
      instance.trackEventWithParameters(event, parameters, anonymously)
    );
  },
  getRemoteVariables() {
    return instance.remoteVariables;
  },
  refreshRemoteVariables: async () => {
    try {
      const vars = await RCTAnalytics.getRemoteVariables();
      instance.remoteVariables = JSON.parse(vars);
    } catch (e) {
      // Do nothing
    }
  },
  createDataDeletionTask(compliance) {
    return instance && instance.createDataDeletionTask(compliance);
  },
  checkStatusDataDeletionTask() {
    return instance && instance.checkStatusDataDeletionTask();
  },
};
