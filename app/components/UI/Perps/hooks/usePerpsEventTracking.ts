import { useCallback } from 'react';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { PerpsEventProperties } from '../constants/eventNames';

/**
 * Simplified hook for Perps event tracking
 * All events include timestamp automatically
 */
export const usePerpsEventTracking = () => {
  const { trackEvent, createEventBuilder } = useMetrics();

  /**
   * Track an event with automatic timestamp
   */
  const track = useCallback(
    (
      eventName: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties: Record<string, unknown> = {},
    ) => {
      const props = {
        [PerpsEventProperties.TIMESTAMP]: Date.now(),
        ...properties,
      };
      trackEvent(createEventBuilder(eventName).addProperties(props).build());
    },
    [trackEvent, createEventBuilder],
  );

  return {
    track,
  };
};
