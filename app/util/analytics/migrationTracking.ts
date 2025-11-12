import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import Logger from '../Logger';

/**
 * Properties for deflation failure tracking
 */
export interface DeflationFailureTrackingProperties {
  error_type: string;
  context: string;
  controller_name?: string;
  [key: string]: unknown; // Allow additional context-specific properties
}

/**
 * Safely tracks deflation failure events with proper enabled state checking
 *
 * This utility function:
 * 1. Checks if MetaMetrics is enabled before tracking
 * 2. Provides a consistent interface for deflation failure tracking
 * 3. Handles errors gracefully without throwing
 *
 * @param errorMessage - The error message from the caught exception
 * @param properties - Context-specific properties for the tracking event
 */
export const trackDeflationFailure = (
  errorMessage: string,
  properties: DeflationFailureTrackingProperties,
): void => {
  try {
    const metaMetrics = MetaMetrics.getInstance();

    // Check if MetaMetrics is enabled before tracking
    if (!metaMetrics.isEnabled()) {
      // MetaMetrics is disabled, skip tracking silently
      return;
    }

    // Track the deflation failure event
    metaMetrics.trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.MIGRATION_DEFLATION_FAILURE,
      )
        .addProperties({
          error_message: errorMessage,
          ...properties,
        })
        .build(),
    );
  } catch (error) {
    // Never throw from analytics tracking - log and continue
    Logger.error(
      error as Error,
      'Error tracking deflation failure event - analytics tracking failed',
    );
  }
};
