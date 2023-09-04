import { InteractionManager } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import Analytics from '../core/Analytics/Analytics';
import Logger from './Logger';
import { DENIED, METRICS_OPT_IN } from '../constants/storage';

interface Params {
  [key: string]: any;
}

interface ErrorParams {
  error: boolean;
  type: string;
  errorMessage: string;
  otherInfo: string;
}

// Function to generate an object with a category property
const generateOpt = (name: string) => ({ category: name });

/**
 * Function to track events.
 * This takes params with the following structure:
 * `{ foo : 'this is not anonymous', bar: {value: 'this is anonymous', anonymous: true} }`
 * @param {string} eventName - The name of the event to track.
 * @param {Params} params - The parameters of the event to track.
 */
export const trackEventV2 = async (eventName: string, params?: Params) => {
  const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
  if (metricsOptIn === DENIED) return;

  InteractionManager.runAfterInteractions(() => {
    let anonymousEvent = false;
    try {
      if (!params || Object.keys(params).length === 0) {
        Analytics.trackEvent(eventName);
      }

      const userParams: Params = {};
      const anonymousParams: Params = {};

      for (const key in params) {
        const property = params[key];

        if (
          property &&
          typeof property === 'object' &&
          !Array.isArray(property)
        ) {
          if (property.anonymous) {
            anonymousEvent = true;
            anonymousParams[key] = property.value;
          } else {
            userParams[key] = property.value;
            anonymousParams[key] = property.value;
          }
        } else {
          userParams[key] = property;
          anonymousParams[key] = property;
        }
      }

      if (Object.keys(userParams).length) {
        Analytics.trackEventWithParameters(eventName, userParams);
      }

      if (anonymousEvent && Object.keys(anonymousParams).length) {
        Analytics.trackEventWithParameters(eventName, anonymousParams, true);
      }
    } catch (error: any) {
      Logger.error(error, 'Error logging analytics');
    }
  });
};

/**
 * This functions logs errors to analytics instead of sentry.
 * The goal is to log errors (that are not errors from our side) like “Invalid Password”.
 * An error like this generally means a user inserted the wrong password, so logging to sentry doesn't make sense.
 * But we still want to log this to analytics so that we are aware of a rapid increase which may mean it's an error
 * from our side, for example, an error with the encryption library.
 * @param {String} type
 * @param {String} errorMessage
 * @param {String} otherInfo
 */
export const trackErrorAsAnalytics = (
  type: string,
  errorMessage: string,
  otherInfo: string,
) => {
  try {
    Analytics.trackEventWithParameters(generateOpt('Error occurred'), {
      error: true,
      type,
      errorMessage,
      otherInfo,
    } as ErrorParams);
  } catch (error: any) {
    Logger.error(error, 'Error logging analytics - trackErrorAsAnalytics');
  }
};

export default {
  trackEvent: trackEventV2,
  trackErrorAsAnalytics,
};
