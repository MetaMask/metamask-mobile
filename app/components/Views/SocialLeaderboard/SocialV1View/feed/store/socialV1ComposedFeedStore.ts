// Optimistic overlay so a post can appear on Social V1 while feed queries
// refetch after POST /api/v1/swap-comments. The social-api remains the source
// of truth; this store is not a substitute for that write.
import type { SocialV1FeedPost } from '../types';

export const COMPOSER_POSTING_DELAY_MS = 1500;

/**
 * Ceiling on how long a post may sit pending before the countdown starts on
 * its own. The banner normally starts it as soon as it mounts; this only fires
 * if the banner never appears, so a post can’t be stranded pending forever.
 */
export const COMPOSER_COUNTDOWN_FALLBACK_MS = 1200;

type Listener = () => void;

/**
 * Immutable view of the store handed to React.
 *
 * React Compiler is enabled for the whole app bundle (and disabled under Jest,
 * see `scripts/react-compiler.js`), so anything read during render must be a
 * reactive input or the compiler is free to cache it forever. Reading this
 * mutable module directly from a component would be a Rules of React violation
 * and would serve a stale feed; consumers get this object through
 * `useSyncExternalStore` instead, and its identity changes on every mutation.
 */
export interface SocialV1ComposedFeedSnapshot {
  composedPosts: SocialV1FeedPost[];
  pendingPost: SocialV1FeedPost | null;
  pendingStartedAtMs: number | null;
  revision: number;
}

interface StoreState {
  composedPosts: SocialV1FeedPost[];
  pendingPost: SocialV1FeedPost | null;
  pendingStartedAtMs: number | null;
  shouldFocusTrending: boolean;
  revision: number;
  snapshot: SocialV1ComposedFeedSnapshot;
  postingTimer: ReturnType<typeof setTimeout> | null;
  countdownFallbackTimer: ReturnType<typeof setTimeout> | null;
  listeners: Set<Listener>;
}

/**
 * Park the mock store on `globalThis` so that Metro Fast Refresh can’t split
 * it into two module instances (composer writing to instance A while the feed
 * reads instance B) — that would leave the posting banner stuck at 100% with
 * no card ever appearing.
 */
const STORE_GLOBAL_KEY = '__mmSocialV1ComposedFeedStore__';

const bootstrap = (): StoreState => ({
  composedPosts: [],
  pendingPost: null,
  pendingStartedAtMs: null,
  shouldFocusTrending: false,
  revision: 0,
  snapshot: {
    composedPosts: [],
    pendingPost: null,
    pendingStartedAtMs: null,
    revision: 0,
  },
  postingTimer: null,
  countdownFallbackTimer: null,
  listeners: new Set(),
});

const globalScope = globalThis as unknown as Record<string, StoreState>;
const state: StoreState = globalScope[STORE_GLOBAL_KEY] ?? bootstrap();
globalScope[STORE_GLOBAL_KEY] = state;

const clearTimers = () => {
  if (state.postingTimer) {
    clearTimeout(state.postingTimer);
    state.postingTimer = null;
  }
  if (state.countdownFallbackTimer) {
    clearTimeout(state.countdownFallbackTimer);
    state.countdownFallbackTimer = null;
  }
};

const notify = () => {
  state.revision += 1;
  // A fresh object per mutation: `useSyncExternalStore` compares snapshots by
  // identity to decide whether to re-render, and it is what makes the feed a
  // reactive input rather than a stale read.
  state.snapshot = {
    composedPosts: state.composedPosts,
    pendingPost: state.pendingPost,
    pendingStartedAtMs: state.pendingStartedAtMs,
    revision: state.revision,
  };
  state.listeners.forEach((listener) => listener());
};

export const subscribeSocialV1ComposedFeed = (
  listener: Listener,
): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};

export const getSocialV1ComposedFeedSnapshot =
  (): SocialV1ComposedFeedSnapshot => state.snapshot;

export const getSocialV1ComposedPosts = (): SocialV1FeedPost[] =>
  state.composedPosts;

export const getSocialV1PendingPost = (): SocialV1FeedPost | null =>
  state.pendingPost;

export const getSocialV1PendingStartedAtMs = (): number | null =>
  state.pendingStartedAtMs;

/**
 * Force every mounted subscriber to re-read the store.
 *
 * `enableFreeze(true)` is global, so a blurred or frozen screen has its
 * passive effects torn down and is therefore unsubscribed. Any `notify()` that
 * lands in that window — which is exactly when the composer is on top — is
 * swallowed, and re-subscribing on focus does not replay it. Screens call this
 * when they regain focus so the feed reconciles with the store regardless.
 */
export const refreshSocialV1ComposedFeed = (): void => {
  notify();
};

export const consumeSocialV1FocusTrending = (): boolean => {
  if (!state.shouldFocusTrending) {
    return false;
  }
  state.shouldFocusTrending = false;
  return true;
};

export const resetSocialV1ComposedFeedStore = (): void => {
  clearTimers();
  state.composedPosts = [];
  state.pendingPost = null;
  state.pendingStartedAtMs = null;
  state.shouldFocusTrending = false;
  notify();
};

export const commitSocialV1PendingPost = (): void => {
  if (!state.pendingPost) {
    return;
  }

  clearTimers();

  // The stored pending post carries the composer-facing id (`composed-*`); the
  // outward-facing pending shape uses `pending-*` so the banner and the
  // eventual card have distinct keys.
  const post: SocialV1FeedPost = {
    ...state.pendingPost,
    id: state.pendingPost.id.replace(/^pending-/, ''),
    isPending: false,
  };

  state.pendingPost = null;
  state.pendingStartedAtMs = null;
  state.composedPosts = [post, ...state.composedPosts];
  notify();
};

/**
 * Start the posting countdown, anchored to the instant the progress bar
 * mounted. Idempotent, so a banner that remounts (tab switch, re-render)
 * keeps the original clock rather than restarting it.
 */
export const startSocialV1PendingPostCountdown = (): void => {
  if (!state.pendingPost || state.pendingStartedAtMs != null) {
    return;
  }

  if (state.countdownFallbackTimer) {
    clearTimeout(state.countdownFallbackTimer);
    state.countdownFallbackTimer = null;
  }

  state.pendingStartedAtMs = Date.now();
  notify();

  // The store owns the commit so the post still lands if the banner unmounts
  // mid-progress (e.g. the user swipes to Following).
  state.postingTimer = setTimeout(() => {
    state.postingTimer = null;
    commitSocialV1PendingPost();
  }, COMPOSER_POSTING_DELAY_MS);
};

/**
 * Park the composed post as pending. The countdown deliberately does *not*
 * start here: the composer is still on screen and popping it plus painting
 * Trending can take longer than `COMPOSER_POSTING_DELAY_MS`, which would
 * commit the post before anyone ever saw the progress bar. `startSocialV1
 * PendingPostCountdown` starts the clock once the banner is actually visible,
 * and the fallback timer here starts it anyway if the banner never mounts, so
 * a post can never be stranded pending.
 */
export const submitSocialV1ComposedPost = (post: SocialV1FeedPost): void => {
  clearTimers();

  state.shouldFocusTrending = true;
  state.pendingStartedAtMs = null;
  state.pendingPost = { ...post, isPending: true, id: `pending-${post.id}` };
  notify();

  state.countdownFallbackTimer = setTimeout(() => {
    state.countdownFallbackTimer = null;
    startSocialV1PendingPostCountdown();
  }, COMPOSER_COUNTDOWN_FALLBACK_MS);
};
