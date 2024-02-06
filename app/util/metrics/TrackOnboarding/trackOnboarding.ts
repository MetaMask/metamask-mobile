import { IMetaMetricsEvent, MetaMetrics } from '../../../core/Analytics';
import { InteractionManager } from 'react-native';
import { JsonMap } from '@segment/analytics-react-native';

/**
 * track onboarding event or save it for when metrics are enabled
 * @param event - the event to track
 * @param properties - the properties map for the event
 * @param saveOnboardingEvent - function to store onboarding event before optin
 */
const trackOnboarding = async (
  event: IMetaMetricsEvent,
  properties: JsonMap = {},
  saveOnboardingEvent?: (event: string) => {
    event: object;
    type: string;
  },
): Promise<void> =>
  InteractionManager.runAfterInteractions(async () => {
    const metrics = MetaMetrics.getInstance();
    const isOnboardingDelayedEvent =
      !metrics.isEnabled() && saveOnboardingEvent;
    if (isOnboardingDelayedEvent) {
      saveOnboardingEvent(event.category);
    } else {
      metrics.trackEvent(event.category, properties);
    }
  });

export default trackOnboarding;
