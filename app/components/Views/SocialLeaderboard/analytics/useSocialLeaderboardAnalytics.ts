import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { hasSocialProfileFromLinkedAddress } from '../../../../util/social/socialProfileAnalytics';

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
  const linkedAddress = useSelector(selectProfileControllerLinkedEvmAddress);
  const hasSocialProfile = hasSocialProfileFromLinkedAddress(linkedAddress);

  // `has_social_profile` is the value when the event fires. A caller can set
  // its own value, as the profile-created event does.
  const track = useCallback(
    (
      eventName: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties: Record<string, unknown> = {},
    ): void => {
      trackEvent(
        createEventBuilder(eventName)
          .addProperties({
            has_social_profile: hasSocialProfile,
            ...properties,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, hasSocialProfile],
  );

  return { track };
};

export default useSocialLeaderboardAnalytics;
