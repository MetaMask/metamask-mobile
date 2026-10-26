import type {
  FeedItem as CoreFeedItem,
  SwapCommentResponse,
} from '@metamask/social-controllers';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { mapFeedItem } from '../../../UI/SocialFeed/utils/mapFeedItem';
import { toSocialFeedPosts } from '../../../UI/SocialFeed/utils/toSocialFeedPosts';

/**
 * Fields social-api adds to `POST /v1/swap-comments` that the
 * `@metamask/social-controllers` type does not declare yet. Its response
 * struct is loose, so they arrive intact.
 */
export interface CreatedSwapCommentExtras {
  positionUid?: string | null;
  /** The card the comment will appear as; `null` when no feed serves it. */
  feedItem?: CoreFeedItem | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCoreFeedItem = (value: unknown): value is CoreFeedItem =>
  isRecord(value) &&
  typeof value.positionId === 'string' &&
  isRecord(value.actor) &&
  Array.isArray(value.trades);

/**
 * The post to show the author while the feeds catch up, or `null` when there
 * is nothing to show: social-api said no feed will serve this position, or it
 * returned a card the app cannot map.
 *
 * `fallback` covers a social-api that predates `feedItem`. With
 * `isTradeInFlight`, it also covers a `null` card: the trade is not indexed
 * yet, so social-api cannot know which feed will serve it.
 */
export const buildPendingPost = (
  created: SwapCommentResponse & CreatedSwapCommentExtras,
  fallback: () => SocialV1FeedPost | null,
  { isTradeInFlight = false }: { isTradeInFlight?: boolean } = {},
): (SocialV1FeedPost & { commentId: string }) | null => {
  let post: SocialV1FeedPost | null;
  if (
    !('feedItem' in created) ||
    (isTradeInFlight && created.feedItem == null)
  ) {
    post = fallback();
  } else if (isCoreFeedItem(created.feedItem)) {
    const item = mapFeedItem(created.feedItem);
    post = item
      ? (toSocialFeedPosts([{ item, core: created.feedItem }])[0] ?? null)
      : null;
  } else {
    post = null;
  }
  if (!post) {
    return null;
  }
  return {
    ...post,
    // Distinct from the server row's key, which a pinned post may sit beside.
    id: `pending-${created.uid}`,
    commentId: created.uid,
    timestampMs: created.timestamp * 1000,
  };
};
