import { InteractionManager } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import Analytics from '../core/Analytics/Analytics';
import Logger from './Logger';
import { DENIED, METRICS_OPT_IN } from '../constants/storage';

/**
 * This takes params with the following structure:
 * { foo : 'this is not anonymous', bar: {value: 'this is anonymous', anonymous: true} }
 * @param {Object} eventName
 * @param {Object} params
 */
export const trackEventV2 = (eventName, params) => {
  const init = async () => {
    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
    if (metricsOptIn === DENIED) return;

    InteractionManager.runAfterInteractions(() => {
      let anonymousEvent = false;
      try {
        if (!params || Object.keys(params).length === 0) {
          Analytics.trackEvent(eventName);
        }

        const userParams = {};
        const anonymousParams = {};

        for (const key in params) {
          const property = params[key];

          if (
            property &&
            typeof property === 'object' &&
            !Array.isArray(property)
          ) {
            if (property.anonymous) {
              anonymousEvent = true;
              // Anonymous property - add only to anonymous params
              anonymousParams[key] = property.value;
            } else {
              // Non-anonymous property - add to both
              userParams[key] = property.value;
              anonymousParams[key] = property.value;
            }
          } else {
            // Non-anonymous properties - add to both
            userParams[key] = property;
            anonymousParams[key] = property;
          }
        }

        // Log all non-anonymous properties
        if (Object.keys(userParams).length) {
          Analytics.trackEventWithParameters(eventName, userParams);
        }

        // Log all anonymous properties
        if (anonymousEvent && Object.keys(anonymousParams).length) {
          Analytics.trackEventWithParameters(eventName, anonymousParams, true);
        }
      } catch (error) {
        Logger.error(error, 'Error logging analytics');
      }
    });
  };
  init();
};

export default {
  trackEvent: trackEventV2,
};
