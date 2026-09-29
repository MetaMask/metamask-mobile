import { playImpact, ImpactMoment } from '../../util/haptics';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import { reportSocialServiceFailure } from '../../util/social/socialServiceTelemetry';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { selectIsUnlocked } from '../../selectors/keyringController';
import { selectFollowingProfileIds } from '../../selectors/socialController';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
  type TraderFollowInteractionSource,
} from '../Views/SocialLeaderboard/analytics';
import { MetaMetricsEvents } from '../../core/Analytics';
import { hasRealAvatar } from '../Views/Homepage/Sections/TopTraders/utils/avatarFallback';

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
  /**
   * Backend-provided avatar URL at tap time. Used to derive
   * `trader_has_profile_picture_set` (real image vs Maskicon fallback).
   */
  traderAvatarUri?: string | null;
}

export interface UseFollowToggleManyResult {
  isFollowing: (addressOrId: string) => boolean;
  toggleFollow: (
    addressOrId: string,
    analyticsContext?: FollowToggleAnalyticsContext,
  ) => Promise<void>;
}

const FOLLOWING_QUERY_KEY = ['SocialService:fetchFollowing'] as const;

type OptimisticFollowListener = () => void;

/**
 * Optimistic follow overrides and in-flight ids live at module scope so every
 * `useFollowToggleMany` instance (carousel + stacked Profiles to follow, etc.)
 * shares one map. Per-hook `useState` would leave stacked screens out of sync
 * until Redux catches up after the network write.
 */
let optimisticFollowState: Record<string, boolean> = {};
const inflightIds = new Set<string>();
const optimisticFollowListeners = new Set<OptimisticFollowListener>();
let lastFollowToggleSessionKey: string | undefined;
let followToggleSessionEpoch = 0;

const emitOptimisticFollowState = (): void => {
  optimisticFollowListeners.forEach((listener) => listener());
};

const subscribeOptimisticFollowState = (
  listener: OptimisticFollowListener,
): (() => void) => {
  optimisticFollowListeners.add(listener);
  return () => {
    optimisticFollowListeners.delete(listener);
  };
};

const getOptimisticFollowState = (): Record<string, boolean> =>
  optimisticFollowState;

const updateOptimisticFollowState = (
  updater: (prev: Record<string, boolean>) => Record<string, boolean>,
): void => {
  const next = updater(optimisticFollowState);
  if (next === optimisticFollowState) {
    return;
  }
  optimisticFollowState = next;
  emitOptimisticFollowState();
};

const getFollowToggleSessionKey = (
  isUnlocked: boolean,
  selectedAddress: string | undefined,
): string => `${isUnlocked ? '1' : '0'}:${selectedAddress ?? ''}`;

const clearFollowToggleSharedState = (): void => {
  inflightIds.clear();
  if (Object.keys(optimisticFollowState).length === 0) {
    return;
  }
  optimisticFollowState = {};
  emitOptimisticFollowState();
};

/**
 * Drops module-scoped optimism and in-flight ids when the wallet identity
 * changes (lock, unlock into a new vault, account switch). Same-session
 * stacked screens share one key and are left alone.
 */
const syncFollowToggleSession = (sessionKey: string): void => {
  if (lastFollowToggleSessionKey === sessionKey) {
    return;
  }
  if (lastFollowToggleSessionKey !== undefined) {
    followToggleSessionEpoch += 1;
    clearFollowToggleSharedState();
  }
  lastFollowToggleSessionKey = sessionKey;
};

/** Clears shared follow-toggle state between unit tests. */
export const resetFollowToggleSharedStateForTests = (): void => {
  lastFollowToggleSessionKey = undefined;
  followToggleSessionEpoch = 0;
  clearFollowToggleSharedState();
};

/**
 * Invalidates the followed-traders query without importing ReactQueryService at
 * module load (that import pulls in Engine and breaks tests that mock Engine).
 */
const invalidateFollowingQuery = async (): Promise<void> => {
  const { default: ReactQueryService } = await import(
    '../../core/ReactQueryService'
  );
  await ReactQueryService.queryClient.invalidateQueries({
    queryKey: FOLLOWING_QUERY_KEY,
  });
};

/**
 * Shared primitive that optimistically toggles follow/unfollow state for one
 * or more traders against `SocialController`. The caller is identified
 * server-side from the JWT attached by `SocialService`, so no `profileId`
 * needs to be passed from the UI.
 *
 * Optimistic overrides are shared across hook instances and cleared
 * automatically once Redux catches up with the intended value, or when the
 * underlying messenger call fails.
 */
export const useFollowToggleMany = (): UseFollowToggleManyResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const { track } = useSocialLeaderboardAnalytics();
  const sessionKey = getFollowToggleSessionKey(isUnlocked, selectedAddress);

  useEffect(() => {
    syncFollowToggleSession(sessionKey);
  }, [sessionKey]);

  const optimisticOverrides = useSyncExternalStore(
    subscribeOptimisticFollowState,
    getOptimisticFollowState,
    getOptimisticFollowState,
  );

  const isFollowing = useCallback(
    (addressOrId: string): boolean =>
      optimisticOverrides[addressOrId] ??
      followingProfileIds.includes(addressOrId),
    [optimisticOverrides, followingProfileIds],
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
      const requestEpoch = followToggleSessionEpoch;

      // Follow-toggle catalog moment (Light impact). Fired before the
      // inflight guard so a quick repeat tap still produces tactile feedback
      // even when the API call is debounced.
      playImpact(ImpactMoment.FollowToggle);

      if (inflightIds.has(addressOrId)) {
        return;
      }
      inflightIds.add(addressOrId);

      updateOptimisticFollowState((prev) => ({
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
        if (requestEpoch !== followToggleSessionEpoch) {
          return;
        }
        await invalidateFollowingQuery();
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
            [SocialLeaderboardEventProperties.TRADER_HAS_PROFILE_PICTURE_SET]:
              hasRealAvatar(analyticsContext.traderAvatarUri),
          });
        }
      } catch (err) {
        if (requestEpoch === followToggleSessionEpoch) {
          updateOptimisticFollowState((prev) => {
            const next = { ...prev };
            delete next[addressOrId];
            return next;
          });
        }
        reportSocialServiceFailure(
          err,
          {
            surface: 'follow',
            operation: nextValue ? 'follow_trader' : 'unfollow_trader',
            extraMessage: nextValue
              ? 'Follow trader failed'
              : 'Unfollow trader failed',
            source: 'useFollowToggle',
            endpoint: nextValue ? 'follow' : 'unfollow',
          },
          { breadcrumb: false },
        );
      } finally {
        if (requestEpoch === followToggleSessionEpoch) {
          inflightIds.delete(addressOrId);
        }
      }
    },
    [followingProfileIds, track],
  );

  useEffect(() => {
    updateOptimisticFollowState((prev) => {
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
