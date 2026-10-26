import { useMemo } from 'react';
import { useSocialFeed } from '../../../../../UI/SocialFeed/data/useSocialFeed';
import type { SocialFeedSource } from '../../../../../UI/SocialFeed/data/socialFeedSource';
import { usePendingPostsOverlay } from '../../../pendingPosts/usePendingPostsOverlay';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';
import { useSelector } from 'react-redux';
import { selectIsSocialV1Enabled } from '../../../../../../selectors/featureFlagController/socialV1';
import { SOCIAL_TRACE_TABS } from '../../../../../../util/social/socialPerformance';

/** Trending reads the generic `leaderboard` scope, Following the per-user one. */
const TAB_AUDIENCE = {
  trending: 'all',
  following: 'following',
} as const;

const TAB_TRACE = {
  trending: SOCIAL_TRACE_TABS.Trending,
  following: SOCIAL_TRACE_TABS.Following,
} as const satisfies Record<SocialV1FeedTab, 'trending' | 'following'>;

export interface UseSocialV1FeedOptions {
  /**
   * The viewer's social profile id. On Following, their just-written posts
   * are pinned on top until the feed returns them.
   */
  ownerProfileId?: string;
  /** Whether the tab is on screen; gates the pending-post refetches. */
  isActive?: boolean;
}

/**
 * V1 feed data source: live trader activity from `SocialService:fetchFeed`,
 * mapped into the V1 card model with the missing enrichment mocked and flagged.
 *
 * Delegates fetching to `useSocialFeed`, which shares its query key with V0's
 * `useTraderFeed`, so either surface warms the cache for the other. The
 * viewer's own new posts appear on Following only: it is the feed that serves
 * them (Trending reads the leaderboard traders' activity).
 */
export const useSocialV1Feed = (
  tab: SocialV1FeedTab = 'trending',
  { ownerProfileId, isActive = true }: UseSocialV1FeedOptions = {},
): UseSocialV1FeedResult => {
  const isSocialV1Treatment = useSelector(selectIsSocialV1Enabled);
  const source = useMemo(
    (): SocialFeedSource => ({
      kind: 'all',
      audience: TAB_AUDIENCE[tab],
    }),
    [tab],
  );

  const {
    posts: livePosts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh: refetch,
    dataUpdatedAt,
  } = useSocialFeed(source, {
    performance: isSocialV1Treatment ? { tab: TAB_TRACE[tab] } : undefined,
  });

  const overlay = usePendingPostsOverlay({
    surface: 'following',
    ownerProfileId: tab === 'following' ? ownerProfileId : undefined,
    serverPosts: livePosts,
    refetch,
    isActive,
  });

  return {
    posts: overlay.posts,
    pinnedPosts: overlay.pinnedPosts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh: overlay.refresh,
    dataUpdatedAt,
  };
};
