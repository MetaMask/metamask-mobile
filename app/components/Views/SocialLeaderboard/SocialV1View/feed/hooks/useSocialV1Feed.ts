import { useMemo } from 'react';
import { useSocialFeed } from '../../../../../UI/SocialFeed/data/useSocialFeed';
import type {
  FeedScope,
  SocialFeedQuery,
} from '../../../../../UI/SocialFeed/data/socialFeedSource';
import { isViewerSocialAuthor } from '../../../../../UI/SocialFeed/utils/isViewerSocialAuthor';
import { useMyProfile } from '../../../MyProfileView/hooks/useMyProfile';
import { usePendingPostsOverlay } from '../../../pendingPosts/usePendingPostsOverlay';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';
import { useSelector } from 'react-redux';
import { selectIsSocialV1Enabled } from '../../../../../../selectors/featureFlagController/socialV1';
import { SOCIAL_TRACE_TABS } from '../../../../../../util/social/socialPerformance';

const TAB_SCOPE = {
  trending: 'trending',
  following: 'following',
} as const satisfies Record<SocialV1FeedTab, FeedScope>;

const TAB_TRACE = {
  trending: SOCIAL_TRACE_TABS.Trending,
  following: SOCIAL_TRACE_TABS.Following,
} as const satisfies Record<SocialV1FeedTab, 'trending' | 'following'>;

export interface UseSocialV1FeedOptions {
  /** Whether the tab is on screen. */
  isActive?: boolean;
}

/**
 * V1 feed data source: live trader activity from `SocialService:fetchFeed`,
 * mapped into the V1 card model with the missing enrichment mocked and flagged.
 *
 * Delegates fetching to `useSocialFeed`. Following shares its query key with
 * V0's Following feed (`useTraderFeed`), so either surface warms the cache for
 * the other. A just-written post is not pinned here. Following also omits
 * the viewer's own posts; those stay on their Posts tab.
 */
export const useSocialV1Feed = (
  tab: SocialV1FeedTab = 'trending',
  { isActive = true }: UseSocialV1FeedOptions = {},
): UseSocialV1FeedResult => {
  const isSocialV1Treatment = useSelector(selectIsSocialV1Enabled);
  const { profile } = useMyProfile();
  const viewerProfileId = profile?.profileId;
  const query = useMemo(
    (): SocialFeedQuery => ({ scope: TAB_SCOPE[tab] }),
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
  } = useSocialFeed(query, {
    performance: isSocialV1Treatment ? { tab: TAB_TRACE[tab] } : undefined,
  });

  const feedPosts = useMemo(() => {
    if (tab !== 'following' || !viewerProfileId) {
      return livePosts;
    }
    return livePosts.filter(
      (post) => !isViewerSocialAuthor(post.item.author.id, viewerProfileId),
    );
  }, [livePosts, tab, viewerProfileId]);

  const overlay = usePendingPostsOverlay({
    surface: 'following',
    ownerProfileId: undefined,
    serverPosts: feedPosts,
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
