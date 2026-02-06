import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { PERPS_EVENT_PROPERTY } from '../constants/eventNames';

// Static helper function - moved outside component to avoid recreation
const allTrue = (conditionArray: boolean[]): boolean =>
  conditionArray.length > 0 && conditionArray.every(Boolean);

interface EventTrackingOptions {
  eventName: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents];
  properties?: Record<string, unknown>;

  // Simple API - most common case
  conditions?: boolean[]; // Track when all conditions are true

  // Advanced API - full control (for future extensibility)
  resetConditions?: boolean[];
}

/**
 * Unified hook for Perps event tracking with both imperative and declarative APIs
 *
 * Supports both usage patterns:
 * 1. Imperative: const { track } = usePerpsEventTracking(); track(event, props);
 * 2. Declarative: usePerpsEventTracking({ eventName, conditions, properties });
 *
 * All events include timestamp automatically.
 *
 * @example
 * // IMPERATIVE: Manual tracking (backward compatible)
 * const { track } = usePerpsEventTracking();
 * track(MetaMetricsEvents.PERPS_CLOSE_POSITION, { asset });
 *
 * @example
 * // DECLARATIVE: Immediate tracking (most common case)
 * usePerpsEventTracking({
 *   eventName: MetaMetricsEvents.PERPS_TP_SL_SCREEN_VIEWED,
 *   properties: { asset, direction }
 * });
 *
 * @example
 * // DECLARATIVE: Conditional tracking
 * usePerpsEventTracking({
 *   eventName: MetaMetricsEvents.PERPS_TP_SL_SCREEN_VIEWED,
 *   conditions: [isVisible],
 *   properties: { asset, direction }
 * });
 */
export const usePerpsEventTracking = (options?: EventTrackingOptions) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  /**
   * Track an event with automatic timestamp (imperative API)
   */
  const track = useCallback(
    (
      eventName: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties: Record<string, unknown> = {},
    ) => {
      const props = {
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: Date.now(),
        ...properties,
      };
      trackEvent(createEventBuilder(eventName).addProperties(props).build());
    },
    [trackEvent, createEventBuilder],
  );

  // Declarative API implementation (similar to usePerpsMeasurement)
  const hasTracked = useRef(false);

  const { actualConditions, actualResetConditions } = useMemo(() => {
    if (!options) {
      // Imperative usage - no declarative logic needed
      return { actualConditions: [], actualResetConditions: [] };
    }

    const { conditions, resetConditions } = options;

    if (!conditions && !resetConditions) {
      // No conditions = immediate tracking (like usePerpsMeasurement)
      return {
        actualConditions: [true],
        actualResetConditions: [],
      };
    }

    return {
      actualConditions: conditions || [],
      actualResetConditions: resetConditions || [],
    };
  }, [options]);

  const shouldTrack = useMemo(
    () => actualConditions.length === 0 || allTrue(actualConditions),
    [actualConditions],
  );

  const shouldReset = useMemo(
    () =>
      actualResetConditions.length > 0 && actualResetConditions.some(Boolean),
    [actualResetConditions],
  );

  useEffect(() => {
    if (!options) return; // Imperative usage only

    // Handle reset conditions
    if (shouldReset && hasTracked.current) {
      hasTracked.current = false;
      return;
    }

    // Handle tracking conditions
    if (shouldTrack && !hasTracked.current) {
      track(options.eventName, options.properties || {});
      hasTracked.current = true;
    }
  }, [options, shouldTrack, shouldReset, track]);

  return {
    track,
  };
};
