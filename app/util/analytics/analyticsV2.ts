import { InteractionManager } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import Analytics from '../../core/Analytics/Analytics';
import Logger from '../Logger';
import { DENIED, METRICS_OPT_IN } from '../../constants/storage';
import {IMetaMetrics} from "../../core/Analytics/MetaMetrics.types";
import {Category, MetaMetricsProvider, Params} from "../../core/Analytics/MetaMetricsProvider.type";
import MetaMetricsProviderSegmentImpl from "../../core/Analytics/MetaMetricsProvider.segment.impl";
import MetaMetricsProviderLegacyImpl from "../../core/Analytics/MetaMetricsProvider.legacy.impl";

interface ErrorParams {
  error: boolean;
  type: string;
  errorMessage: string;
  otherInfo: string;
}

/**
 * Function to track events.
 * This takes params with the following structure:
 * `{ foo : 'this is not anonymous', bar: {value: 'this is anonymous', anonymous: true} }`
 * @param eventName - The name of the event to track.
 * @param params - The parameters of the event to track.
 * @param provider - The provider to use for tracking the event. Optional. Defaults to legacy.
 */

// TODO update params to use an object (and create an interface for it)
//  Add the ability to switch analytics implementation to Segment with a param value that will be undefined by default
//  Value should be an enum with the following values: 'segment', 'legacy' and 'legacy' should be the default value
export const trackEventV2 = async (eventName: string, params?: Params, provider: MetaMetricsProvider = MetaMetricsProviderLegacyImpl.getInstance()) => {
  const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
  if (metricsOptIn === DENIED) return;

  InteractionManager.runAfterInteractions(() => {
    let anonymousEvent = false;
    try {
      if (!params || Object.keys(params).length === 0) {
        provider.trackEvent(eventName);
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

      // TODO use the segment client directly instead of
      //  the Analytics wrapper when the switch has Segment enum value
      if (Object.keys(userParams).length) {
        provider.trackEventWithParameters(eventName, userParams);
      }

      if (anonymousEvent && Object.keys(anonymousParams).length) {
        provider.trackEventWithParameters(eventName, anonymousParams, true);
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
 * @param type - error type
 * @param errorMessage - error message
 * @param otherInfo
 * @param provider - The provider to use for tracking the event. Optional. Defaults to legacy.
 */
export const trackErrorAsAnalytics = (
  type: string,
  errorMessage: string,
  otherInfo: string,
  provider: MetaMetricsProvider = new MetaMetricsProviderLegacyImpl()
) => {
  try {
    provider.trackEventWithParameters({ category: 'Error occurred'}, {
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
