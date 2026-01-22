import type { ControllerMessenger } from '../types';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';
import Logger from '../../../util/Logger';

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
