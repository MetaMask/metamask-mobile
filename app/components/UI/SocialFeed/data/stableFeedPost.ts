import type { FeedItem as CoreFeedItem } from '@metamask/social-controllers';
import isEqual from 'lodash/isEqual';
import type { SocialV1FeedPost } from '../types';

export interface StableFeedPostEntry {
  core: CoreFeedItem;
  eventId: string | undefined;
  post: SocialV1FeedPost;
}

/**
 * Open hold time is formatted while the card renders, so a newer snapshot
 * label is the same post.
 */
export const sameFeedPost = (
  previous: SocialV1FeedPost,
  next: SocialV1FeedPost,
): boolean => {
  if (previous.item.holdTimeLabel === next.item.holdTimeLabel) {
    return isEqual(previous, next);
  }

  return isEqual(
    {
      ...previous,
      item: { ...previous.item, holdTimeLabel: next.item.holdTimeLabel },
    },
    next,
  );
};

/**
 * Returns the cached post when the source row has not changed.
 *
 * A later page rebuilds every row object, but the earlier pages keep the same
 * position reference. That reference is enough to skip mapping. A refresh
 * hands over a new position with the same content, and the deep compare keeps
 * the post the row already rendered.
 */
export const retainStableFeedPost = (
  cache: Map<string, StableFeedPostEntry>,
  id: string,
  core: CoreFeedItem,
  eventId: string | undefined,
  build: () => SocialV1FeedPost,
): SocialV1FeedPost => {
  const cached = cache.get(id);
  if (cached && cached.core === core && cached.eventId === eventId) {
    return cached.post;
  }

  const built = build();
  const post = cached && sameFeedPost(cached.post, built) ? cached.post : built;
  cache.set(id, { core, eventId, post });
  return post;
};

export const pruneStableFeedPosts = (
  cache: Map<string, StableFeedPostEntry>,
  activeIds: ReadonlySet<string>,
): void => {
  cache.forEach((_cached, id) => {
    if (!activeIds.has(id)) {
      cache.delete(id);
    }
  });
};
