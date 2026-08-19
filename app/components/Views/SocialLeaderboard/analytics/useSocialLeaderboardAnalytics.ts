import { useCallback } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';

/**
 * Imperative analytics hook for the social leaderboard / follow-trading
 * surfaces. Mirrors the Perps (`usePerpsEventTracking`) and Predict
 * (`PredictAnalytics`) patterns — call `track(eventName, properties)` with
 * one of the `MetaMetricsEvents.SOCIAL_*` event constants.
 *
 * Property keys should be referenced via `SocialLeaderboardEventProperties`
 * to keep them aligned with the segment-schema YAMLs.
 */
export const useSocialLeaderboardAnalytics = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  const track = useCallback(
    (
      eventName: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties: Record<string, unknown> = {},
    ): void => {
      trackEvent(
        createEventBuilder(eventName).addProperties(properties).build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  return { track };
};

export default useSocialLeaderboardAnalytics;
