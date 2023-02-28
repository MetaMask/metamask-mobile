import { InteractionManager } from 'react-native';
import {
  MetaMetrics,
  MetaMetricsEvents,
  IMetaMetricsEvent,
} from '../core/Analytics';
import Logger from './Logger';

export const checkEnabled = (): boolean => MetaMetrics.checkEnabled();

export const getMetaMetricsId = (): string => {
  try {
    return MetaMetrics.getMetaMetricsId();
  } catch {
    throw new Error(
      'MetaMetrics Error: Not able to retrieve the MetaMetrics ID',
    );
  }
};

export const trackLegacyEvent = (event: IMetaMetricsEvent, params?: any) => {
  MetaMetrics.trackEvent(event.name, { ...event.properties, ...params });
};

export const trackLegacyAnonymousEvent = (
  event: IMetaMetricsEvent,
  params?: any,
) => {
  MetaMetrics.trackAnonymousEvent(event.name, {
    ...event.properties,
    ...params,
  });
};

/**
 * This takes params with the following structure:
 * { foo : 'this is not anonymous', bar: {value: 'this is anonymous', anonymous: true} }
 *
 * @param {Object} eventName
 * @param {Object} params
 */
export const trackEvent = (event: IMetaMetricsEvent, params?: any): void => {
  InteractionManager.runAfterInteractions(() => {
    let anonymousEvent = false;
    try {
      if ((!params && !event.properties) || Object.keys(params).length === 0) {
        MetaMetrics.trackEvent(event.name, {});
      }

      const userParams = { ...event.properties } as any;
      const anonymousParams = {} as any;

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
        MetaMetrics.trackEvent(event.name, userParams);
      }

      // Log all anonymous properties
      if (anonymousEvent && Object.keys(anonymousParams).length) {
        MetaMetrics.trackAnonymousEvent(event.name, anonymousParams);
      }
    } catch (error: any) {
      Logger.error(error, 'Error logging analytics');
    }
  });
};

/**
 * This functions logs errors to analytics instead of sentry.
 * The objective is to log errors (that are not errors from our side) like “Invalid Password”.
 * An error like this generally means a user inserted the wrong password, so logging to sentry doesn't make sense.
 * But we still want to log this to analytics so that we are aware of a rapid increase which may mean it's an error from our side, for example, an error with the encryption library.
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
    const { name } = MetaMetricsEvents.ERROR;
    MetaMetrics.trackEvent(name, {
      error: true,
      type,
      errorMessage,
      otherInfo,
    });
  } catch (error: any) {
    Logger.error(error, 'Error logging analytics - trackErrorAsAnalytics');
  }
};
