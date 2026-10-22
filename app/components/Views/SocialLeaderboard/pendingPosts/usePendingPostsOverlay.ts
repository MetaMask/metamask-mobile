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

/** Delays between confirmation refetches, summing to about the window. */
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

/**
 * Splits `serverPosts` and the store into what `surface` renders.
 *
 * Following keeps a post pinned even once its feed returns it, because that
 * feed is ordered by trade time and the real row can land far down the list;
 * it is released by the next user refresh. The Posts tab is ordered by comment
 * time, so there the real row takes over as soon as it arrives. Either way a
 * pinned post hides the server row for its position, which still carries the
 * older comment until the feed worker links the new one.
 */
export const overlayPendingPosts = (
  surface: PendingPostSurface,
  entries: readonly PendingPostEntry[],
  ownerProfileId: string | undefined,
  serverPosts: SocialV1FeedPost[],
): PendingPostsOverlay => {
  if (!ownerProfileId) {
    return { pinnedPosts: [], posts: serverPosts };
  }
  const servedCommentIds = new Set(
    serverPosts.flatMap((post) => (post.commentId ? [post.commentId] : [])),
  );
  const pinned = entries.filter(
    (entry) =>
      entry.ownerProfileId === ownerProfileId &&
      !entry.dismissedOn[surface] &&
      (surface === 'following' || !servedCommentIds.has(entry.commentId)),
  );
  if (pinned.length === 0) {
    return { pinnedPosts: [], posts: serverPosts };
  }
  const pinnedCommentIds = new Set(pinned.map((entry) => entry.commentId));
  const pinnedPositionIds = new Set(
    pinned.flatMap((entry) => (entry.positionId ? [entry.positionId] : [])),
  );
  return {
    // The pending card's id is kept on the confirmed copy so the list does not
    // remount (and re-animate) it when the swap happens.
    pinnedPosts: pinned.map((entry) =>
      entry.confirmedPost
        ? { ...entry.confirmedPost, id: entry.post.id }
        : entry.post,
    ),
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
}

export interface UsePendingPostsOverlayResult extends PendingPostsOverlay {
  /**
   * A user refresh: releases this surface's settled pinned posts (when it has
   * an owner), then refetches.
   */
  refresh: () => Promise<void>;
}

/**
 * Overlays the viewer's pending posts on a feed surface, confirms them when the
 * feed returns them, and refetches the first page on a short backoff until it
 * does.
 */
export const usePendingPostsOverlay = ({
  surface,
  ownerProfileId,
  serverPosts,
  refetch,
  isActive = true,
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

  // What is awaited, as primitives, so the refetch loop restarts only when
  // that changes rather than on every store or feed update.
  const { awaitingKey, newestAwaitingAtMs } = useMemo(() => {
    const awaiting = ownerProfileId
      ? entries.filter(
          (entry) =>
            entry.ownerProfileId === ownerProfileId &&
            entry.confirmedPost === null,
        )
      : [];
    return {
      awaitingKey: awaiting.map((entry) => entry.commentId).join(),
      newestAwaitingAtMs: Math.max(0, ...awaiting.map((e) => e.createdAtMs)),
    };
  }, [entries, ownerProfileId]);
  const schedule = useMemo(
    () => getConfirmationSchedule(getHardwareTier(), networkTier),
    [networkTier],
  );

  useEffect(() => {
    if (
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
      if (cancelled || attempt >= schedule.length) {
        return;
      }
      timer = setTimeout(() => {
        attempt += 1;
        refetchRef
          .current()
          .catch(() => undefined)
          .finally(scheduleNext);
      }, schedule[attempt]);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [awaitingKey, isActive, newestAwaitingAtMs, schedule]);

  const overlay = useMemo(
    () => overlayPendingPosts(surface, entries, ownerProfileId, serverPosts),
    [entries, ownerProfileId, serverPosts, surface],
  );

  // Only a refresh of the surface that shows the pins may release them: the
  // hook also backs Trending and other traders' profiles, with no owner.
  const refresh = useCallback(async () => {
    if (ownerProfileId) {
      dismissSettledPendingPosts(surface);
    }
    await refetchRef.current();
  }, [ownerProfileId, surface]);

  return { ...overlay, refresh };
};
