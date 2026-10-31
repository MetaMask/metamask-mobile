import type { AnalyticsContext } from '@metamask/analytics-controller';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from './AnalyticsEventBuilder';

/** Version context supplied by a generated event facade. */
export interface AnalyticsEventContext {
  readonly protocols: {
    readonly event_version: number;
  };
}

/**
 * Shared boundary implemented by Mobile for generated event facades.
 * Property validation and explicit version selection belong to each facade.
 */
export interface AnalyticsEventTransport {
  track(
    eventName: string,
    properties: object,
    context: AnalyticsEventContext,
  ): void;
}

type TrackAnalyticsEvent = (
  event: AnalyticsTrackingEvent,
  context?: AnalyticsContext,
) => void;

/**
 * Connects generated event facades to Mobile's existing analytics pipeline.
 * Accepts either useAnalytics().trackEvent or analytics.trackEvent; does not
 * initialize Engine, dispatch to Segment directly, or bypass consent.
 *
 * @param trackEvent - Mobile tracking function to receive the built event and context.
 * @returns A transport reusable across generated event names and versions.
 */
export const createTypedEventTransport = (
  trackEvent: TrackAnalyticsEvent,
): AnalyticsEventTransport => ({
  track: (eventName, properties, context): void => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(eventName)
        .addProperties({ ...properties })
        .build(),
      { ...context },
    );
  },
});
