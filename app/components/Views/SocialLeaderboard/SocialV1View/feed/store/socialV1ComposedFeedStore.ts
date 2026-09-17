// THIS IS A MOCK STORE FOR THE SOCIAL POST COMPOSER VIEW
// It’s an in-memory module store so a post can survive leaving the composer.
// TODO(Social):  When real POST exists, this should go away (or shrink to “optimistic UI while the request is in flight”).
import type { SocialV1FeedPost } from '../types';
export const COMPOSER_POSTING_DELAY_MS = 1500;

type Listener = () => void;

interface StoreState {
  composedPosts: SocialV1FeedPost[];
  pendingPost: SocialV1FeedPost | null;
  pendingStartedAtMs: number | null;
  shouldFocusTrending: boolean;
  revision: number;
  postingTimer: ReturnType<typeof setTimeout> | null;
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
  postingTimer: null,
  listeners: new Set(),
});

const globalScope = globalThis as unknown as Record<string, StoreState>;
const state: StoreState = globalScope[STORE_GLOBAL_KEY] ?? bootstrap();
globalScope[STORE_GLOBAL_KEY] = state;

const notify = () => {
  state.revision += 1;
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

export const getSocialV1ComposedPosts = (): SocialV1FeedPost[] =>
  state.composedPosts;

export const getSocialV1PendingPost = (): SocialV1FeedPost | null =>
  state.pendingPost;

export const getSocialV1PendingStartedAtMs = (): number | null =>
  state.pendingStartedAtMs;

export const getSocialV1ComposedFeedRevision = (): number => state.revision;

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
  if (state.postingTimer) {
    clearTimeout(state.postingTimer);
    state.postingTimer = null;
  }
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

  if (state.postingTimer) {
    clearTimeout(state.postingTimer);
    state.postingTimer = null;
  }

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

export const submitSocialV1ComposedPost = (post: SocialV1FeedPost): void => {
  if (state.postingTimer) {
    clearTimeout(state.postingTimer);
    state.postingTimer = null;
  }

  state.shouldFocusTrending = true;
  state.pendingStartedAtMs = Date.now();
  state.pendingPost = { ...post, isPending: true, id: `pending-${post.id}` };
  notify();

  // The store owns the commit lifecycle. Banner + feed effects are visual
  // only; if they never run (e.g. tab not focused, JS paused) the post still
  // lands on Trending once the timer fires.
  state.postingTimer = setTimeout(() => {
    state.postingTimer = null;
    commitSocialV1PendingPost();
  }, COMPOSER_POSTING_DELAY_MS);
};
