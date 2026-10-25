import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import { feedItemAssetClass } from './filterSocialV1FeedPosts';
import {
  matchesShellAssetType,
  matchesShellMarketCap,
  matchesShellTraderCohort,
} from './matchShellFilters';
import type { SocialShellFilters } from './types';

/**
 * Client-side Live filter for one post. Data-backed: asset type, the
 * All / Following cohort (followed profile ids), the 30-day PnL cohorts, and
 * market cap on spot fills that carry it. Verification and 24h volume are
 * hidden in the sheet until the API can honor them.
 */
export const matchesLivePost = (
  post: SocialV1FeedPost,
  filters: SocialShellFilters,
  followingProfileIds: ReadonlySet<string>,
): boolean =>
  matchesShellAssetType(feedItemAssetClass(post.item), filters) &&
  matchesShellTraderCohort({
    traderCohort: filters.traderCohort,
    pnl30d: post.item.author.pnl30d,
    isFollowing: followingProfileIds.has(post.item.author.id),
  }) &&
  matchesShellMarketCap(post.marketCapUsd, filters);
