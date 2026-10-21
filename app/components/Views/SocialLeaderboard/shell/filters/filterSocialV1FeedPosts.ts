import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../../UI/SocialFeed/types';
import {
  matchesShellAssetType,
  matchesShellMarketCap,
  type ShellFilterAssetClass,
} from './matchShellFilters';
import type { SocialShellFilters } from './types';

export const feedItemAssetClass = (
  item: SocialV1FeedItem,
): ShellFilterAssetClass =>
  item.variant.startsWith('perps') ? 'perps' : 'spot';

/**
 * Client-side Following filter on posts already loaded. Type and market cap
 * (USD billions) honor payload fields. Verification and 24h volume are not
 * applied — those chips are hidden until the API can support them.
 */
export const filterSocialV1FeedPosts = (
  posts: readonly SocialV1FeedPost[],
  filters: SocialShellFilters,
): SocialV1FeedPost[] =>
  posts.filter(
    (post) =>
      matchesShellAssetType(feedItemAssetClass(post.item), filters) &&
      matchesShellMarketCap(post.marketCapUsd, filters),
  );
