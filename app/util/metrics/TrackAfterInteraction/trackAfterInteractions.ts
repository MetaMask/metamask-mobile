import { IMetaMetricsEvent, MetaMetrics } from '../../../core/Analytics';
import { InteractionManager } from 'react-native';
import { JsonMap } from '@segment/analytics-react-native';

/**
 * track or save event async after all interactions are done
 * @param event - the event to track
 * @param properties - the properties map for the event
 * @param saveOnboardingEvent - function to store onboarding event before optin
 */
const trackAfterInteractions = async (
  event: IMetaMetricsEvent,
  properties: JsonMap = {},
  saveOnboardingEvent?: (event: string) => {
    event: object;
    type: string;
  },
): Promise<void> =>
  InteractionManager.runAfterInteractions(async () => {
    const metrics = await MetaMetrics.getInstance();
    const isOnboardingDelayedEvent =
      !metrics?.isEnabled() && saveOnboardingEvent;
    if (isOnboardingDelayedEvent) {
      saveOnboardingEvent(event.category);
    } else {
      metrics?.trackEvent(event.category, properties);
    }
  });

export default trackAfterInteractions;
