import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import {
  feedItemAssetClass,
  matchesPositionStatus,
} from './filterSocialV1FeedPosts';
import { matchesShellAssetType } from './matchShellFilters';
import type { SocialShellFilters } from './types';

/**
 * Client-side Live filter for one post. Data-backed: asset type and open or
 * closed position. Trader cohort, market cap, verification, and 24h volume
 * are hidden.
 */
export const matchesLivePost = (
  post: SocialV1FeedPost,
  filters: SocialShellFilters,
): boolean =>
  matchesShellAssetType(feedItemAssetClass(post.item), filters) &&
  matchesPositionStatus(post.item.variant, filters);
