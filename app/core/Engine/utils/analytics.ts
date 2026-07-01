import type { ControllerMessenger } from '../types';
import type { AnalyticsTrackingEvent as PackageAnalyticsTrackingEvent } from '@metamask/analytics-controller';
import type {
  AnalyticsUnfilteredProperties,
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../util/analytics/analytics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../../util/Logger';
import { store } from '../../../store';
import {
  enrichWithABTests,
  getRemoteFeatureFlagsFromState,
} from '../../../util/analytics/enrichWithABTests';

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
  let enrichedEvent: AnalyticsTrackingEvent;

  try {
    enrichedEvent = enrichWithABTests(
      event,
      getRemoteFeatureFlagsFromState(store.getState()),
    );
  } catch {
    enrichedEvent = event;
  }

  try {
    // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
    (
      initMessenger as ControllerMessenger & {
        call: (
          action: 'AnalyticsController:trackEvent',
          event: PackageAnalyticsTrackingEvent,
        ) => void;
      }
    ).call(
      'AnalyticsController:trackEvent',
      enrichedEvent as unknown as PackageAnalyticsTrackingEvent,
    );
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
      .addProperties(properties)
      .build();
    trackEvent(initMessenger, analyticsEvent);
  } catch (error) {
    // Event building and tracking failures should not break controller functionality
    // Error is logged but not thrown
    Logger.log('Error building or tracking analytics event', error);
  }
};
