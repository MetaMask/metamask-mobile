import { playImpact, ImpactMoment } from '../../util/haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../util/social/socialServiceTelemetry';
import { selectFollowingProfileIds } from '../../selectors/socialController';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
  type TraderFollowInteractionSource,
} from '../Views/SocialLeaderboard/analytics';
import { MetaMetricsEvents } from '../../core/Analytics';

/**
 * Analytics context attached to a follow/unfollow action so the
 * `Trader Follow Interaction` event carries the originating surface and
 * (optionally) the trader's leaderboard rank.
 */
export interface FollowToggleAnalyticsContext {
  /** Surface where the toggle was triggered. */
  source: TraderFollowInteractionSource;
  /**
   * Wallet address of the trader. Required for the analytics event because
   * the hook's `addressOrId` argument can be a Clicker `profileId` (UUID),
   * not a wallet address.
   */
  traderAddress: string;
  /** Display name of the trader, when available. */
  traderUsername?: string;
  /** Leaderboard rank when triggered from leaderboard / home_carousel. */
  traderRank?: number;
}

export interface UseFollowToggleManyResult {
  isFollowing: (addressOrId: string) => boolean;
  toggleFollow: (
    addressOrId: string,
    analyticsContext?: FollowToggleAnalyticsContext,
  ) => Promise<void>;
}

/**
 * Shared primitive that optimistically toggles follow/unfollow state for one
 * or more traders against `SocialController`. The caller is identified
 * server-side from the JWT attached by `SocialService`, so no `profileId`
 * needs to be passed from the UI.
 *
 * Local optimistic overrides are kept per trader id and cleared automatically
 * once Redux catches up with the intended value, or when the underlying
 * messenger call fails.
 */
export const useFollowToggleMany = (): UseFollowToggleManyResult => {
  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const { track } = useSocialLeaderboardAnalytics();

  const [optimisticFollowState, setOptimisticFollowState] = useState<
    Record<string, boolean>
  >({});
  const inflightIdsRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback(
    (addressOrId: string): boolean =>
      optimisticFollowState[addressOrId] ??
      followingProfileIds.includes(addressOrId),
    [optimisticFollowState, followingProfileIds],
  );

  const toggleFollow = useCallback(
    async (
      addressOrId: string,
      analyticsContext?: FollowToggleAnalyticsContext,
    ): Promise<void> => {
      const currentlyFollowing =
        optimisticFollowState[addressOrId] ??
        followingProfileIds.includes(addressOrId);
      const nextValue = !currentlyFollowing;

      // Follow-toggle catalog moment (Light impact). Fired before the
      // inflight guard so a quick repeat tap still produces tactile feedback
      // even when the API call is debounced.
      playImpact(ImpactMoment.FollowToggle);

      if (inflightIdsRef.current.has(addressOrId)) {
        return;
      }
      inflightIdsRef.current.add(addressOrId);

      setOptimisticFollowState((prev) => ({
        ...prev,
        [addressOrId]: nextValue,
      }));

      try {
        const opts = { targets: [addressOrId] };
        await (Engine.controllerMessenger.call as CallableFunction)(
          nextValue
            ? 'SocialController:followTrader'
            : 'SocialController:unfollowTrader',
          opts,
        );
        if (analyticsContext) {
          track(MetaMetricsEvents.SOCIAL_TRADER_FOLLOW_INTERACTION, {
            [SocialLeaderboardEventProperties.ACTION]: nextValue
              ? SocialLeaderboardEventValues.ACTION.FOLLOW
              : SocialLeaderboardEventValues.ACTION.UNFOLLOW,
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
              analyticsContext.traderAddress,
            [SocialLeaderboardEventProperties.TRADER_USERNAME]:
              analyticsContext.traderUsername,
            [SocialLeaderboardEventProperties.SOURCE]: analyticsContext.source,
            [SocialLeaderboardEventProperties.TRADER_RANK]:
              analyticsContext.traderRank,
          });
        }
      } catch (err) {
        setOptimisticFollowState((prev) => {
          const next = { ...prev };
          delete next[addressOrId];
          return next;
        });
        Logger.error(
          err as Error,
          buildSocialLoggerErrorOptions({
            surface: 'follow',
            operation: nextValue ? 'follow_trader' : 'unfollow_trader',
            extraMessage: nextValue
              ? 'Follow trader failed'
              : 'Unfollow trader failed',
            source: 'useFollowToggle',
            error: err,
            endpoint: nextValue ? 'follow' : 'unfollow',
          }),
        );
      } finally {
        inflightIdsRef.current.delete(addressOrId);
      }
    },
    [optimisticFollowState, followingProfileIds, track],
  );

  useEffect(() => {
    setOptimisticFollowState((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [id, value] of Object.entries(prev)) {
        if (followingProfileIds.includes(id) === value) {
          changed = true;
          continue;
        }
        next[id] = value;
      }
      return changed ? next : prev;
    });
  }, [followingProfileIds]);

  return { isFollowing, toggleFollow };
};

export interface UseFollowToggleResult {
  isFollowing: boolean;
  toggleFollow: (
    analyticsContext?: FollowToggleAnalyticsContext,
  ) => Promise<void>;
}

/**
 * Single-trader convenience wrapper around {@link useFollowToggleMany}.
 */
export const useFollowToggle = (addressOrId: string): UseFollowToggleResult => {
  const { isFollowing, toggleFollow } = useFollowToggleMany();
  const toggle = useCallback(
    (analyticsContext?: FollowToggleAnalyticsContext) =>
      toggleFollow(addressOrId, analyticsContext),
    [toggleFollow, addressOrId],
  );
  return {
    isFollowing: isFollowing(addressOrId),
    toggleFollow: toggle,
  };
};

export default useFollowToggle;
