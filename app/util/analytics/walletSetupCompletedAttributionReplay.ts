import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import type { ITrackingEvent } from './analytics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from './AnalyticsEventBuilder';
import type { WalletSetupCompletedAttributionAnalyticsPayload } from './walletSetupCompletedAttribution';

export const WALLET_SETUP_COMPLETED_EVENT_NAME =
  EVENT_NAME.WALLET_SETUP_COMPLETED;

const DEFAULT_EVENT_TRACKING_DELAY_MS = 200;

/**
 * Merges persisted acquisition fields into a buffered Wallet Setup Completed
 * event before it is sent to Segment for the first time.
 */
export function enrichBufferedWalletSetupCompletedEvent(
  bufferedEvent: AnalyticsTrackingEvent,
  attributionProps: WalletSetupCompletedAttributionAnalyticsPayload,
): AnalyticsTrackingEvent {
  if (bufferedEvent.name !== WALLET_SETUP_COMPLETED_EVENT_NAME) {
    return bufferedEvent;
  }

  if (Object.keys(attributionProps).length === 0) {
    return bufferedEvent;
  }

  return AnalyticsEventBuilder.createEventBuilder(bufferedEvent)
    .addProperties({ ...attributionProps })
    .build();
}

/**
 * Replays onboarding events buffered before metrics opt-in, enriching Wallet
 * Setup Completed with acquisition props when marketing consent is granted.
 */
export function scheduleBufferedOnboardingEventReplay(options: {
  events: [ITrackingEvent][];
  attributionProps: WalletSetupCompletedAttributionAnalyticsPayload;
  trackEvent: (event: AnalyticsTrackingEvent) => void;
  eventTrackingDelayMs?: number;
}): void {
  const {
    events,
    attributionProps,
    trackEvent,
    eventTrackingDelayMs = DEFAULT_EVENT_TRACKING_DELAY_MS,
  } = options;

  let delay = 0;

  events.forEach((eventArgs) => {
    setTimeout(() => {
      const buffered = AnalyticsEventBuilder.createEventBuilder(
        eventArgs[0],
      ).build();
      const event = enrichBufferedWalletSetupCompletedEvent(
        buffered,
        attributionProps,
      );
      trackEvent(event);
    }, delay);
    delay += eventTrackingDelayMs;
  });
}
