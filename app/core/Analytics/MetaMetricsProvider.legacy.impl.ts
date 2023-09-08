import {
  MetaMetricsProvider,
  Category,
  Params,
} from './MetaMetricsProvider.type';
import Analytics from './Analytics';

/**
 * This is the implementation of the MetaMetricsProvider interface for legacy Analytics.
 */
export default class MetaMetricsProviderLegacyImpl
  implements MetaMetricsProvider
{
  static getInstance = (): MetaMetricsProvider =>
    new MetaMetricsProviderLegacyImpl();

  /**
   * Tracks an event with the given name.
   * @param eventName - The name of the event to track.
   * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
   */
  trackEvent = (eventName: string, anonymously?: boolean): void => {
    Analytics.trackEvent(eventName, anonymously);
  };

  /**
   * Tracks an event with the given name and parameters.
   * @param eventName - The name of the event to track.
   * @param params - The parameters of the event to track.
   * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
   */
  trackEventWithParameters(
    eventName: string | Category,
    params?: Params,
    anonymously?: boolean,
  ): void {
    Analytics.trackEventWithParameters(eventName, params, anonymously);
  }
}
