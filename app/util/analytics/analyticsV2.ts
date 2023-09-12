import { InteractionManager } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../Logger';
import { DENIED, METRICS_OPT_IN } from '../../constants/storage';
import {
  MetaMetricsProvider,
  Params,
} from '../../core/Analytics/MetaMetricsProvider.type';
import MetaMetricsProviderLegacyImpl from '../../core/Analytics/MetaMetricsProvider.legacy.impl';

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
export const trackEventV2 = async (
  eventName: string,
  params?: Params | MetaMetricsProvider,
  provider?: MetaMetricsProvider,
) => {

  const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
  if (metricsOptIn === DENIED) return;

  // some calls in JS do not pass params, so we need to check if params is undefined
  // if params is undefined, we need to check if provider is undefined
  // if provider is undefined, we need to use the legacy provider
  // If params has methods unique to MetaMetricsProvider, use it as provider

  const isParamAMetricsProvider = params
      && 'trackEventWithParameters' in params
      && 'trackEventWithParameters' in params;
 let metametricsProvider: MetaMetricsProvider;
 let parameters: Params | undefined;
  if (isParamAMetricsProvider && !provider) {
    // use params as provider
    metametricsProvider = params as MetaMetricsProvider;
  }else if (!provider) {
    metametricsProvider = MetaMetricsProviderLegacyImpl.getInstance();
    parameters = params as Params;
  }else {
    metametricsProvider = provider;
    parameters = params as Params;
  }

  // DEBUG
  console.debug('trackEventV2', eventName, params, metametricsProvider);

  InteractionManager.runAfterInteractions(() => {
    let anonymousEvent = false;
    try {
      if (!parameters || Object.keys(parameters).length === 0) {
        metametricsProvider.trackEvent(eventName);
      }

      const userParams: Params = {};
      const anonymousParams: Params = {};

      for (const key in parameters) {
        const property = parameters[key];

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
        metametricsProvider.trackEventWithParameters(eventName, userParams);
      }

      if (anonymousEvent && Object.keys(anonymousParams).length) {
        metametricsProvider.trackEventWithParameters(eventName, anonymousParams, true);
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
  provider: MetaMetricsProvider = MetaMetricsProviderLegacyImpl.getInstance(),
) => {
  try {
    provider.trackEventWithParameters({ category: 'Error occurred' }, {
      error: true,
      type,
      errorMessage,
      otherInfo,
    } as ErrorParams);
  } catch (error: any) {
    Logger.error(error, 'Error logging analytics - trackErrorAsAnalytics');
  }
};

// TODO make import consistent accross the app
//  either use default or named imports but not both...
export default {
  trackEvent: trackEventV2,
  trackErrorAsAnalytics,
};
