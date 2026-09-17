// THIS IS A MOCK STORE FOR THE SOCIAL POST COMPOSER VIEW
// It’s an in-memory module store so a post can survive leaving the composer.
// TODO(Social):  When real POST exists, this should go away (or shrink to “optimistic UI while the request is in flight”).
import type { SocialV1FeedPost } from '../types';

export const COMPOSER_POSTING_DELAY_MS = 1500;

type Listener = () => void;

const listeners = new Set<Listener>();

let composedPosts: SocialV1FeedPost[] = [];
let pendingPost: SocialV1FeedPost | null = null;
let shouldFocusTrending = false;
let postingTimer: ReturnType<typeof setTimeout> | null = null;

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeSocialV1ComposedFeed = (
  listener: Listener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSocialV1ComposedPosts = (): SocialV1FeedPost[] => composedPosts;

export const getSocialV1PendingPost = (): SocialV1FeedPost | null =>
  pendingPost;

export const consumeSocialV1FocusTrending = (): boolean => {
  if (!shouldFocusTrending) {
    return false;
  }
  shouldFocusTrending = false;
  return true;
};

export const resetSocialV1ComposedFeedStore = (): void => {
  if (postingTimer) {
    clearTimeout(postingTimer);
    postingTimer = null;
  }
  composedPosts = [];
  pendingPost = null;
  shouldFocusTrending = false;
  notify();
};

export const submitSocialV1ComposedPost = (post: SocialV1FeedPost): void => {
  if (postingTimer) {
    clearTimeout(postingTimer);
  }

  shouldFocusTrending = true;
  pendingPost = { ...post, isPending: true, id: `pending-${post.id}` };
  notify();

  postingTimer = setTimeout(() => {
    postingTimer = null;
    pendingPost = null;
    composedPosts = [post, ...composedPosts];
    notify();
  }, COMPOSER_POSTING_DELAY_MS);
};
