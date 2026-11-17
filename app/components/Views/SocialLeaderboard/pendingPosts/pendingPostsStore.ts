// The viewer's own just-written posts. Trending and the Posts tab pin the
// local card on top, greyed out, until the feed returns the same comment and
// the server's copy takes its place (Trending waits for its own feed). A pull-to-refresh drops it once it is
// confirmed or five minutes old. Following shows the post only when its API
// response includes it. The social-api remains the source of truth.
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';

export type PendingPostSurface = 'trending' | 'following' | 'posts';

/**
 * How long a local Posts card may stay unconfirmed before a pull-to-refresh
 * drops it. Linking a comment can take a few minutes, so a refresh inside
 * this window still refetches and replaces the card when the feed has it,
 * but does not throw the local copy away.
 */
export const PENDING_POST_CONFIRM_WINDOW_MS = 5 * 60 * 1000;

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
    dismissedOn: { trending: false, following: false, posts: false },
  };
  setEntries([
    entry,
    ...state.entries.filter(
      (existing) => existing.commentId !== post.commentId,
    ),
  ]);
};

/**
 * Records the server's copy of each entry a feed has now returned. The first
 * copy wins: every mounted surface runs this, and each serves its own object
 * for the same comment, so replacing on identity makes surfaces overwrite each
 * other's copy forever (a store write per pass, never settling).
 */
export const confirmPendingPosts = (serverPosts: SocialV1FeedPost[]): void => {
  const byCommentId = new Map(
    serverPosts.flatMap((post) =>
      post.commentId ? [[post.commentId, post] as const] : [],
    ),
  );
  let changed = false;
  const entries = state.entries.map((entry) => {
    const serverPost = byCommentId.get(entry.commentId);
    if (!serverPost || entry.confirmedPost !== null) {
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
 * needs to hold, and ones past the confirmation window, which it is not going
 * to get. Without `servedCommentIds` an entry is settled once any feed has
 * confirmed it; with it, only once that surface serves the comment itself.
 */
export const dismissSettledPendingPosts = (
  surface: PendingPostSurface,
  nowMs = Date.now(),
  servedCommentIds?: ReadonlySet<string>,
): void => {
  let changed = false;
  const entries = state.entries.map((entry) => {
    const isConfirmed = servedCommentIds
      ? servedCommentIds.has(entry.commentId)
      : entry.confirmedPost !== null;
    const settled =
      isConfirmed ||
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
  if (state.entries.length > 0) {
    setEntries([]);
  }
};
