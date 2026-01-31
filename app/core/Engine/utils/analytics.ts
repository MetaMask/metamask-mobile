import type { ControllerMessenger } from '../types';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import type { AnalyticsUnfilteredProperties } from '../../../util/analytics/analytics.types';
import Logger from '../../../util/Logger';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { filterUndefinedValues } from '../../../util/analytics/filterUndefinedValues';

/**
 * Track an analytics event using the initMessenger.
 * Handles error catching internally to reduce verbosity in controller init files.
 *
 * Analytics tracking failures should not break controller functionality,
 * so errors are logged but not thrown.
 *
 * @param initMessenger - The controller init messenger instance
 * @param event - The analytics tracking event to track
 */
export const trackEvent = (
  initMessenger: ControllerMessenger,
  event: AnalyticsTrackingEvent,
): void => {
  try {
    (
      initMessenger as ControllerMessenger & {
        call: (
          action: 'AnalyticsController:trackEvent',
          event: AnalyticsTrackingEvent,
        ) => void;
      }
    ).call('AnalyticsController:trackEvent', event);
  } catch (error) {
    // Analytics tracking failures should not break controller functionality
    // Error is logged but not thrown
    Logger.log('Error tracking analytics event', error);
  }
};

/**
 * Build and track an analytics event using the initMessenger.
 * Handles both event building and tracking with error catching to reduce verbosity
 * in controller init files.
 *
 * Event building and tracking failures should not break controller functionality,
 * so errors are logged but not thrown.
 *
 * @param initMessenger - The controller init messenger instance
 * @param event - The event name or event object to track
 * @param properties - Optional properties to add to the event (undefined values will be filtered out, null is treated as empty object)
 */
export const buildAndTrackEvent = (
  initMessenger: ControllerMessenger,
  event: string | IMetaMetricsEvent | ITrackingEvent,
  properties?: AnalyticsUnfilteredProperties,
): void => {
  try {
    const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
      .addProperties(filterUndefinedValues(properties))
      .build();
    trackEvent(initMessenger, analyticsEvent);
  } catch (error) {
    // Event building and tracking failures should not break controller functionality
    // Error is logged but not thrown
    Logger.log('Error building or tracking analytics event', error);
  }
};
