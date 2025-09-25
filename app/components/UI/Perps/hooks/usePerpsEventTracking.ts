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

  /**
   * Track a transaction lifecycle (initiated, submitted, executed/failed)
   */
  const trackTransaction = useCallback(
    (
      baseName: string,
      status:
        | 'initiated'
        | 'submitted'
        | 'executed'
        | 'failed'
        | 'partially_filled',
      properties: Record<string, unknown> = {},
    ) => {
      const eventMap = {
        initiated: `${baseName}_INITIATED`,
        submitted: `${baseName}_SUBMITTED`,
        executed: `${baseName}_EXECUTED`,
        failed: `${baseName}_FAILED`,
        partially_filled: `${baseName}_PARTIALLY_FILLED`,
      };

      const eventName = eventMap[status] as keyof typeof MetaMetricsEvents;
      const eventValue = MetaMetricsEvents[eventName];
      if (eventValue) {
        track(eventValue, properties);
      }
    },
    [track],
  );

  return {
    track,
    trackTransaction,
  };
};
