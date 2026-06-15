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
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';

function isWalletSetupCompletedEvent(
  event: IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
): boolean {
  const builtEvent = AnalyticsEventBuilder.createEventBuilder(event).build();
  return builtEvent.name === EVENT_NAME.WALLET_SETUP_COMPLETED;
}

function deliverOnboardingEvent(
  event: IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void {
  const analyticsEvent =
    AnalyticsEventBuilder.createEventBuilder(event).build();
  const isOnboardingDelayedEvent =
    !analytics.isEnabled() && Boolean(saveOnboardingEvent);

  if (isOnboardingDelayedEvent) {
    saveOnboardingEvent?.(analyticsEvent);
    return;
  }

  analytics.trackEvent(analyticsEvent);
}

/**
 * track onboarding event or save it for when metrics are enabled
 * @param event - the event to track
 * @param saveOnboardingEvent - function to store onboarding event before optin
 */
const trackOnboarding = (
  event: IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void => {
  // Wallet Setup Completed must not wait on InteractionManager — navigation away
  // from ChoosePassword can defer or prevent the callback from running.
  if (isWalletSetupCompletedEvent(event)) {
    deliverOnboardingEvent(event, saveOnboardingEvent);
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    deliverOnboardingEvent(event, saveOnboardingEvent);
  });
};

export default trackOnboarding;
