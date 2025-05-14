import { useCallback } from 'react';
import { useAnalytics } from './typewriter/segment';
import MetaMetrics from './MetaMetrics';
import { IMetaMetricsEvent, ITrackingEvent , JsonMap } from './MetaMetrics.types';
import { MetricsEventBuilder } from './MetricsEventBuilder';

// Map MetaMetrics event names to typewriter function names
const EVENT_MAP = {
  'Onboarding Welcome Message Viewed': 'welcomeMessageViewed',
  // Add more mappings as needed
};

export const useEnhancedMetrics = () => {
  const metricsInstance = MetaMetrics.getInstance();
  const typewriterFunctions = useAnalytics();

  const trackEvent = useCallback(
    (event: ITrackingEvent) => {
      if (!metricsInstance.isEnabled()) return;
      // Check if there's a typewriter function for this event
      const typewriterFunctionName = EVENT_MAP[event.name as keyof typeof EVENT_MAP];
      const typewriterFunction = typewriterFunctionName ? typewriterFunctions[typewriterFunctionName as keyof typeof typewriterFunctions] : null;

      if (typewriterFunction) {
        try {
          // Let typewriter's generated functions handle the typing
          // This bypasses TypeScript checks but preserves runtime validation
          (typewriterFunction as (params: { properties: JsonMap }) => void)({
            properties: event.properties
          });
        } catch (error) {
          console.error(`Error tracking event with typewriter: ${event.name}`, error);
          metricsInstance.trackEvent(event);
        }
      } else {
        // Use the standard MetaMetrics tracking for events without typewriter functions
        metricsInstance.trackEvent(event);
      }
    },
    [metricsInstance, typewriterFunctions]
  );

  // Create an enhanced event builder with typewriter validation capabilities
  const createEventBuilder = useCallback(
    (eventName: IMetaMetricsEvent | ITrackingEvent) => {
      const builder = MetricsEventBuilder.createEventBuilder(eventName);

      // We could enhance the builder with validation based on typewriter schema
      // This would require exposing typewriter schemas or validation methods

      return builder;
    },
    []
  );

  return {
    trackEvent,
    createEventBuilder,
    // Re-export existing MetaMetrics methods for compatibility
    isEnabled: metricsInstance.isEnabled,
    enable: metricsInstance.enable,
    addTraitsToUser: metricsInstance.addTraitsToUser,
    reset: metricsInstance.reset,
    flush: metricsInstance.flush,
    // Direct access to typewriter functions for new code
    typewriter: typewriterFunctions
  };
};
