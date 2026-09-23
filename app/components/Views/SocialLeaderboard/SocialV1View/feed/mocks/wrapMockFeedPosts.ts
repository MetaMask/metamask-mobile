import type { SocialV1FeedPost } from '../types';
import { MOCK_SOCIAL_V1_FEED_ITEMS } from './socialV1Feed.mock';

export const wrapMockFeedPosts = (
  nowMs: number = Date.now(),
): SocialV1FeedPost[] =>
  MOCK_SOCIAL_V1_FEED_ITEMS.map((item, index) => ({
    id: `mock-post-${item.id}`,
    authorHandle: 'alpha-queen',
    authorImageUrl: null,
    timestampMs: nowMs - index * 120_000,
    likeCount: 0,
    commentCount: 0,
    item,
  }));
