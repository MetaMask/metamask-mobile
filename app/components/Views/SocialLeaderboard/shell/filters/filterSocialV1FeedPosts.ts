import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../../UI/SocialFeed/types';
import {
  matchesShellAssetType,
  matchesShellMarketCap,
  matchesShellTraderCohort,
  type ShellFilterAssetClass,
} from './matchShellFilters';
import type { SocialShellFilters } from './types';

export const feedItemAssetClass = (
  item: SocialV1FeedItem,
): ShellFilterAssetClass =>
  item.variant.startsWith('perps') ? 'perps' : 'spot';

/**
 * Open and closed are the feed variants. `spotShare` is a composer preview
 * and matches neither, so a position filter drops it.
 */
const matchesPositionStatus = (
  variant: SocialV1FeedItem['variant'],
  filters: SocialShellFilters,
): boolean => {
  if (filters.positionStatus === 'open') {
    return variant === 'spotOpen' || variant === 'perpsOpen';
  }
  if (filters.positionStatus === 'closed') {
    return variant === 'spotClosed' || variant === 'perpsClosed';
  }
  return true;
};

/**
 * Client-side feed filter on posts already loaded. Type, 30-day cohort,
 * market cap (USD billions), and position status honor payload fields.
 * Verification and 24h volume are not applied — those chips are hidden
 * until the API can support them.
 */
export const filterSocialV1FeedPosts = (
  posts: readonly SocialV1FeedPost[],
  filters: SocialShellFilters,
): SocialV1FeedPost[] =>
  posts.filter(
    (post) =>
      matchesShellAssetType(feedItemAssetClass(post.item), filters) &&
      matchesPositionStatus(post.item.variant, filters) &&
      matchesShellTraderCohort({
        traderCohort: filters.traderCohort,
        pnl30d: post.item.author.pnl30d,
      }) &&
      matchesShellMarketCap(post.marketCapUsd, filters),
  );
