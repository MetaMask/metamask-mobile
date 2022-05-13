'use strict';

import { METRICS_OPT_IN, AGREED, DENIED } from '../constants/storage';
import { Appearance, NativeModules } from 'react-native';
import AUTHENTICATION_TYPE from '../constants/userProperties';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../util/Logger';
import { ANALYTICS_EVENTS_V2 } from '../util/analyticsV2';
import { store } from '../store';
const RCTAnalytics = NativeModules.Analytics;

const USER_PROFILE_PROPERTY = {
  ENABLE_OPENSEA_API: 'Enable OpenSea API',
  NFT_AUTODETECTION: 'NFT Autodetection',
  THEME: 'Theme',

  ON: 'ON',
  OFF: 'OFF',
  AUTHENTICATION_TYPE: 'Authentication Type',
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
      preferencesController?.useCollectibleDetection
        ? USER_PROFILE_PROPERTY.ON
        : USER_PROFILE_PROPERTY.OFF,
    );
    RCTAnalytics.setUserProfileProperty(
      USER_PROFILE_PROPERTY.THEME,
      appThemeStyle,
    );
  };

  /**
   * Track event if enabled and not DEV mode
   */
  _trackEvent(name, { event, params = {}, value, info, anonymously = false }) {
    const isAnalyticsPreferenceSelectedEvent =
      ANALYTICS_EVENTS_V2.ANALYTICS_PREFERENCE_SELECTED === event;
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
    } else {
      Logger.log(`Analytics '${name}' -`, event, params, value, info);
    }
  }

  /**
   * Creates a Analytics instance
   */
  constructor(metricsOptIn) {
    if (!Analytics.instance) {
      this.enabled = metricsOptIn === AGREED;
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
}

let instance;

export default {
  init: async () => {
    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
    instance = new Analytics(metricsOptIn);
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
  getEnabled() {
    return instance && instance.enabled;
  },
  getDistinctId() {
    return instance && instance.getDistinctId();
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
};
