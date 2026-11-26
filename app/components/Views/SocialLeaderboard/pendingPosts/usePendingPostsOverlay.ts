import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useSelector } from 'react-redux';
import {
  type NetworkTier,
  useNetworkTier,
} from '../../../../hooks/useNetworkTier';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  getHardwareTier,
  type HardwareTier,
} from '../../../../util/deviceCapability';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import {
  confirmPendingPosts,
  dismissSettledPendingPosts,
  getPendingPostsSnapshot,
  PENDING_POST_CONFIRM_WINDOW_MS,
  type PendingPostEntry,
  type PendingPostSurface,
  resetPendingPosts,
  subscribePendingPosts,
} from './pendingPostsStore';

/**
 * Delays between confirmation refetches. Once the schedule runs out the last
 * delay repeats until the confirmation window closes.
 */
const DEFAULT_CONFIRM_SCHEDULE_MS = [1_000, 2_000, 4_000, 8_000, 15_000];
const SLOW_NETWORK_CONFIRM_SCHEDULE_MS = [2_000, 6_000, 15_000];
const CONSTRAINED_CONFIRM_SCHEDULE_MS = [5_000, 15_000];

/**
 * Refetch cadence while a post waits for the feeds. Unknown tiers get the
 * default; only a known lack of connectivity turns it off.
 */
export const getConfirmationSchedule = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): number[] => {
  if (networkTier === 'NONE') {
    return [];
  }
  if (networkTier === 'SLOW_CELLULAR') {
    return hardwareTier === 'LOW'
      ? CONSTRAINED_CONFIRM_SCHEDULE_MS
      : SLOW_NETWORK_CONFIRM_SCHEDULE_MS;
  }
  return DEFAULT_CONFIRM_SCHEDULE_MS;
};

export interface PendingPostsOverlay {
  /** The viewer's own pending or just-confirmed posts, newest first. */
  pinnedPosts: SocialV1FeedPost[];
  /** The server posts, minus the ones a pinned post stands in for. */
  posts: SocialV1FeedPost[];
}

const getServedCommentIds = (
  serverPosts: SocialV1FeedPost[],
): ReadonlySet<string> =>
  new Set(
    serverPosts.flatMap((post) => (post.commentId ? [post.commentId] : [])),
  );

/**
 * Splits `serverPosts` and the store into what `surface` renders.
 *
 * Trending and the Posts tab pin a local copy on top. On Posts it stands in
 * until that feed returns the same comment, and hides the stale row for its
 * position meanwhile. On Trending the card stays pending until Trending itself
 * returns the comment, even when another feed already has it, so the pending
 * state only clears once the post is really in this feed. Trending's copy then
 * replaces the pending card in place, pinned on top until a refresh, and its
 * row is hidden from the rest of the feed. A trending position can carry
 * several items (its trade and each comment), so only the comment is hidden.
 * Following shows whatever the API returned, in the feed's own order.
 */
export const overlayPendingPosts = (
  surface: PendingPostSurface,
  entries: readonly PendingPostEntry[],
  ownerProfileId: string | undefined,
  serverPosts: SocialV1FeedPost[],
): PendingPostsOverlay => {
  if (!ownerProfileId || surface === 'following') {
    return { pinnedPosts: [], posts: serverPosts };
  }
  const servedByCommentId = new Map(
    serverPosts.flatMap((post) =>
      post.commentId ? [[post.commentId, post] as const] : [],
    ),
  );
  const keepsServedPins = surface === 'trending';
  const pinned = entries.filter(
    (entry) =>
      entry.ownerProfileId === ownerProfileId &&
      !entry.dismissedOn[surface] &&
      (keepsServedPins || !servedByCommentId.has(entry.commentId)),
  );
  if (pinned.length === 0) {
    return { pinnedPosts: [], posts: serverPosts };
  }
  const pinnedCommentIds = new Set(pinned.map((entry) => entry.commentId));
  const pinnedPositionIds = keepsServedPins
    ? new Set<string>()
    : new Set(
        pinned.flatMap((entry) => (entry.positionId ? [entry.positionId] : [])),
      );
  return {
    // The pending card's id is kept on the confirmed copy so the list does not
    // remount it when the swap happens, and a streamed copy drops its event id
    // so the card already on screen does not play an entrance.
    // Trending swaps in only its own copy; Posts also takes another feed's.
    pinnedPosts: pinned.map((entry) => {
      const serverPost =
        servedByCommentId.get(entry.commentId) ??
        (keepsServedPins ? null : entry.confirmedPost);
      return serverPost
        ? { ...serverPost, id: entry.post.id, realtimeEventId: undefined }
        : entry.post;
    }),
    posts: serverPosts.filter(
      (post) =>
        !(post.commentId && pinnedCommentIds.has(post.commentId)) &&
        !(post.position && pinnedPositionIds.has(post.position.positionId)),
    ),
  };
};

export interface UsePendingPostsOverlayOptions {
  surface: PendingPostSurface;
  /** The viewer's social profile id; omit on someone else's surface. */
  ownerProfileId: string | undefined;
  serverPosts: SocialV1FeedPost[];
  /** Refetches the surface's first page. */
  refetch: () => Promise<void>;
  /** Whether the surface is on screen; confirmation refetches only run then. */
  isActive?: boolean;
  /**
   * Refetches on a short backoff until the surface returns the post. Turn it
   * off for a surface that streams new posts in over the socket.
   */
  refetchUntilServed?: boolean;
}

export interface UsePendingPostsOverlayResult extends PendingPostsOverlay {
  /**
   * A user refresh: releases this surface's settled pinned posts (when it has
   * an owner), then refetches.
   */
  refresh: () => Promise<void>;
}

/**
 * Overlays the viewer's pending posts on a feed surface and confirms them when
 * the feed returns them. Unless `refetchUntilServed` is off, it also refetches
 * the first page on a short backoff until the feed does.
 */
export const usePendingPostsOverlay = ({
  surface,
  ownerProfileId,
  serverPosts,
  refetch,
  isActive = true,
  refetchUntilServed = true,
}: UsePendingPostsOverlayOptions): UsePendingPostsOverlayResult => {
  const entries = useSyncExternalStore(
    subscribePendingPosts,
    getPendingPostsSnapshot,
    getPendingPostsSnapshot,
  );
  const isUnlocked = useSelector(selectIsUnlocked);
  const networkTier = useNetworkTier();
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!isUnlocked) {
      resetPendingPosts();
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (entries.some((entry) => entry.confirmedPost === null)) {
      confirmPendingPosts(serverPosts);
    }
  }, [entries, serverPosts]);

  const servedCommentIds = useMemo(
    () => getServedCommentIds(serverPosts),
    [serverPosts],
  );

  // What is awaited, as primitives, so the refetch loop restarts only when
  // that changes rather than on every store or feed update. Trending waits for
  // its own feed to return the comment; Posts for any feed to.
  const { awaitingKey, newestAwaitingAtMs } = useMemo(() => {
    const awaiting = ownerProfileId
      ? entries.filter(
          (entry) =>
            entry.ownerProfileId === ownerProfileId &&
            (surface === 'trending'
              ? !entry.dismissedOn.trending &&
                !servedCommentIds.has(entry.commentId)
              : entry.confirmedPost === null),
        )
      : [];
    return {
      awaitingKey: awaiting.map((entry) => entry.commentId).join(),
      newestAwaitingAtMs: Math.max(0, ...awaiting.map((e) => e.createdAtMs)),
    };
  }, [entries, ownerProfileId, servedCommentIds, surface]);
  const schedule = useMemo(
    () => getConfirmationSchedule(getHardwareTier(), networkTier),
    [networkTier],
  );

  useEffect(() => {
    if (
      !refetchUntilServed ||
      !isActive ||
      !awaitingKey ||
      schedule.length === 0 ||
      Date.now() - newestAwaitingAtMs >= PENDING_POST_CONFIRM_WINDOW_MS
    ) {
      return undefined;
    }
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleNext = () => {
      const delay = schedule[Math.min(attempt, schedule.length - 1)];
      if (
        cancelled ||
        Date.now() + delay - newestAwaitingAtMs > PENDING_POST_CONFIRM_WINDOW_MS
      ) {
        return;
      }
      timer = setTimeout(() => {
        attempt += 1;
        refetchRef
          .current()
          .catch(() => undefined)
          .finally(scheduleNext);
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [awaitingKey, isActive, newestAwaitingAtMs, refetchUntilServed, schedule]);

  const overlay = useMemo(
    () => overlayPendingPosts(surface, entries, ownerProfileId, serverPosts),
    [entries, ownerProfileId, serverPosts, surface],
  );

  // Only a refresh of the surface that shows the pins may release them: the
  // hook also backs feeds with no owner, such as Following and other traders'
  // profiles.
  // Trending releases only what it already serves, so a refresh never drops a
  // pin for a post the feed does not show yet.
  const refresh = useCallback(async () => {
    if (ownerProfileId) {
      dismissSettledPendingPosts(
        surface,
        Date.now(),
        surface === 'trending' ? servedCommentIds : undefined,
      );
    }
    await refetchRef.current();
  }, [ownerProfileId, servedCommentIds, surface]);

  return { ...overlay, refresh };
};
