// The viewer's own just-written posts, shown on the surfaces that will
// eventually return them (Following and their Posts tab) until those feeds do.
// The social-api remains the source of truth: an entry is only ever the card
// the POST returned, and each surface stops showing it once its own data
// carries the same comment.
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';

export type PendingPostSurface = 'following' | 'posts';

/**
 * How long a post may stay unconfirmed before a pull-to-refresh is allowed to
 * drop it. The feed worker normally links a comment within a few seconds; this
 * also bounds the confirmation refetches.
 */
export const PENDING_POST_CONFIRM_WINDOW_MS = 30_000;

/** How long after posting the profile may still jump to its Posts tab. */
const POSTS_TAB_FOCUS_WINDOW_MS = 10_000;

export interface PendingPostEntry {
  commentId: string;
  /** The position the comment is on, to hide its stale server row meanwhile. */
  positionId: string | null;
  /** Social profile id of the author; other profiles never see the entry. */
  ownerProfileId: string;
  /** The card the POST returned, already marked pending. */
  post: SocialV1FeedPost;
  createdAtMs: number;
  /** The server's copy, once a feed has returned the comment. */
  confirmedPost: SocialV1FeedPost | null;
  dismissedOn: Record<PendingPostSurface, boolean>;
}

type Listener = () => void;

interface StoreState {
  entries: readonly PendingPostEntry[];
  postsTabFocusRequestedAtMs: number | null;
  listeners: Set<Listener>;
}

/**
 * Parked on `globalThis` so Metro Fast Refresh cannot split the composer and
 * the feeds across two module instances.
 */
const STORE_GLOBAL_KEY = '__mmSocialPendingPostsStore__';

const globalScope = globalThis as unknown as Record<string, StoreState>;
const state: StoreState = globalScope[STORE_GLOBAL_KEY] ?? {
  entries: [],
  postsTabFocusRequestedAtMs: null,
  listeners: new Set(),
};
globalScope[STORE_GLOBAL_KEY] = state;

/** Every mutation swaps `entries` for a new array: it is the snapshot. */
const setEntries = (entries: readonly PendingPostEntry[]) => {
  state.entries = entries;
  state.listeners.forEach((listener) => listener());
};

export const subscribePendingPosts = (listener: Listener): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};

export const getPendingPostsSnapshot = (): readonly PendingPostEntry[] =>
  state.entries;

/** Adds a just-written post. `post.commentId` is required to reconcile it. */
export const addPendingPost = ({
  ownerProfileId,
  post,
  nowMs = Date.now(),
}: {
  ownerProfileId: string;
  post: SocialV1FeedPost & { commentId: string };
  nowMs?: number;
}): void => {
  const entry: PendingPostEntry = {
    commentId: post.commentId,
    positionId: post.position?.positionId ?? null,
    ownerProfileId,
    post: { ...post, isPending: true },
    createdAtMs: nowMs,
    confirmedPost: null,
    dismissedOn: { following: false, posts: false },
  };
  setEntries([
    entry,
    ...state.entries.filter(
      (existing) => existing.commentId !== post.commentId,
    ),
  ]);
};

/** Records the server's copy of each entry a feed has now returned. */
export const confirmPendingPosts = (serverPosts: SocialV1FeedPost[]): void => {
  const byCommentId = new Map(
    serverPosts.flatMap((post) =>
      post.commentId ? [[post.commentId, post] as const] : [],
    ),
  );
  let changed = false;
  const entries = state.entries.map((entry) => {
    const serverPost = byCommentId.get(entry.commentId);
    if (!serverPost || entry.confirmedPost === serverPost) {
      return entry;
    }
    changed = true;
    return { ...entry, confirmedPost: serverPost };
  });
  if (changed) {
    setEntries(entries);
  }
};

/**
 * Called on a user refresh of `surface`: drops what that surface no longer
 * needs to hold — confirmed entries, which the feed now serves in place, and
 * ones past the confirmation window, which it is not going to.
 */
export const dismissSettledPendingPosts = (
  surface: PendingPostSurface,
  nowMs = Date.now(),
): void => {
  let changed = false;
  const entries = state.entries.map((entry) => {
    const settled =
      entry.confirmedPost !== null ||
      nowMs - entry.createdAtMs >= PENDING_POST_CONFIRM_WINDOW_MS;
    if (!settled || entry.dismissedOn[surface]) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      dismissedOn: { ...entry.dismissedOn, [surface]: true },
    };
  });
  if (changed) {
    setEntries(entries);
  }
};

export const resetPendingPosts = (): void => {
  state.postsTabFocusRequestedAtMs = null;
  if (state.entries.length > 0) {
    setEntries([]);
  }
};

/** Asks the viewer's profile to open its Posts tab next time it gains focus. */
export const requestPostsTabFocus = (nowMs = Date.now()): void => {
  state.postsTabFocusRequestedAtMs = nowMs;
};

/** Reads and clears a recent {@link requestPostsTabFocus}. */
export const consumePostsTabFocus = (nowMs = Date.now()): boolean => {
  const requestedAtMs = state.postsTabFocusRequestedAtMs;
  state.postsTabFocusRequestedAtMs = null;
  return (
    requestedAtMs !== null && nowMs - requestedAtMs <= POSTS_TAB_FOCUS_WINDOW_MS
  );
};
