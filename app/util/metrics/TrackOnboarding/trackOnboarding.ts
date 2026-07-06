import { analytics } from '../../../util/analytics/analytics';
import { InteractionManager } from 'react-native';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';

/**
 * track onboarding event or save it for when metrics are enabled
 * @param event - the event to track
 * @param saveOnboardingEvent - function to store onboarding event before optin
 */
const trackOnboardingEvent = (
  event: IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void => {
  const analyticsEvent =
    AnalyticsEventBuilder.createEventBuilder(event).build();
  const isOnboardingDelayedEvent =
    !analytics.isEnabled() && saveOnboardingEvent;
  if (isOnboardingDelayedEvent) {
    saveOnboardingEvent(analyticsEvent);
  } else {
    analytics.trackEvent(analyticsEvent);
  }
};

const trackOnboarding = (
  event: IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void => {
  if (analytics.isEnabled()) {
    trackOnboardingEvent(event, saveOnboardingEvent);
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    trackOnboardingEvent(event, saveOnboardingEvent);
  });
};

export default trackOnboarding;
