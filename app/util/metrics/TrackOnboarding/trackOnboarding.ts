import { analytics } from '../../../util/analytics/analytics';
import { InteractionManager } from 'react-native';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';

/**
 * track onboarding event or save it for when metrics are enabled
 * @param event - the event to track
 * @param properties - the properties map for the event
 * @param saveOnboardingEvent - function to store onboarding event before optin
 */
const trackOnboarding = (
  event: ITrackingEvent,
  saveOnboardingEvent?: (...args: [ITrackingEvent]) => void,
): void => {
  InteractionManager.runAfterInteractions(async () => {
    const isOnboardingDelayedEvent =
      !analytics.isEnabled() && saveOnboardingEvent;
    if (isOnboardingDelayedEvent) {
      saveOnboardingEvent(event);
    } else {
      // Convert ITrackingEvent to AnalyticsTrackingEvent format
      const analyticsEvent =
        AnalyticsEventBuilder.createEventBuilder(event).build();
      analytics.trackEvent(analyticsEvent);
    }
  });
};

export default trackOnboarding;
