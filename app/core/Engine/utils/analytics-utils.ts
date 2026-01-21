import type { ControllerMessenger } from '../types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import Logger from '../../../util/Logger';

/**
 * Track an analytics event using the initMessenger.
 * Handles event building and error catching internally to reduce verbosity in controller init files.
 *
 * Analytics tracking failures should not break controller functionality,
 * so errors are logged but not thrown.
 *
 * @param initMessenger - The controller init messenger instance
 * @param event - The event name (string) or event object (IMetaMetricsEvent | ITrackingEvent)
 * @param properties - Optional properties to add to the event
 */
export const trackEvent = (
  initMessenger: ControllerMessenger,
  event: string | IMetaMetricsEvent | ITrackingEvent,
  properties?: AnalyticsEventProperties,
): void => {
  try {
    const eventBuilder = AnalyticsEventBuilder.createEventBuilder(event);
    if (properties) {
      eventBuilder.addProperties(properties);
    }
    const analyticsEvent = eventBuilder.build();
    (
      initMessenger as ControllerMessenger & {
        call: (
          action: 'AnalyticsController:trackEvent',
          event: typeof analyticsEvent,
        ) => void;
      }
    ).call('AnalyticsController:trackEvent', analyticsEvent);
  } catch (error) {
    // Analytics tracking failures should not break controller functionality
    // Error is logged but not thrown
    Logger.log('Error tracking analytics event', error);
  }
};
