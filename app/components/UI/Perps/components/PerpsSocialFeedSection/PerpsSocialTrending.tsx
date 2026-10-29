import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  SocialFeedEmpty,
  SocialFeedError,
  SocialFeedPostShell,
  SocialFeedSkeleton,
  SocialFeedSurfaceProvider,
  SocialV1FeedPostList,
  HYPERLIQUID_CAIP2_CHAIN_ID,
  useSocialFeed,
  type SocialFeedSource,
  type SocialV1FeedPost,
} from '../../../SocialFeed';
import { navigateToSocialV1Profile } from '../../../../Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { useMyProfile } from '../../../../Views/SocialLeaderboard/MyProfileView/hooks';

export const PERPS_TRENDING_POST_COUNT = 3;

const PERPS_TRENDING_SOURCE: SocialFeedSource = {
  scope: 'trending',
  chains: [HYPERLIQUID_CAIP2_CHAIN_ID],
};

const SOURCE = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME;

const PerpsSocialTrending: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const { posts, isLoading, error, refresh } = useSocialFeed(
    PERPS_TRENDING_SOURCE,
    { pageSize: PERPS_TRENDING_POST_COUNT },
  );

  const handleAuthorPress = useCallback(
    (post: SocialV1FeedPost) => {
      navigateToSocialV1Profile(navigation, {
        traderId: post.item.author.id,
        traderName: post.authorHandle,
        traderAddress: post.item.author.address,
        traderAvatarUri:
          post.authorImageUrl ?? post.item.author.avatarUri ?? undefined,
        source: SOURCE,
        viewerProfileId: myProfile?.profileId ?? undefined,
        viewerAddress: myProfile?.linkedAccountAddress ?? undefined,
      });
    },
    [navigation, myProfile],
  );

  const handlePositionPress = useCallback(
    (post: SocialV1FeedPost) => {
      if (!post.position) {
        return;
      }
      navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
        positionId: post.position.positionId,
        position: post.position,
        author: post.item.author,
        comment: post.item.comment,
        isClosed:
          post.item.variant === 'perpsClosed' ||
          post.item.variant === 'spotClosed',
      });
    },
    [navigation],
  );

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostShell
        post={post}
        onAuthorPress={handleAuthorPress}
        onPositionPress={post.position ? handlePositionPress : undefined}
      />
    ),
    [handleAuthorPress, handlePositionPress],
  );

  if (isLoading && posts.length === 0) {
    return (
      <Box twClassName="gap-6">
        <SocialFeedSkeleton count={PERPS_TRENDING_POST_COUNT} />
      </Box>
    );
  }

  if (error && posts.length === 0) {
    return <SocialFeedError onRetry={() => refresh()} />;
  }

  if (posts.length === 0) {
    return <SocialFeedEmpty />;
  }

  return (
    <SocialFeedSurfaceProvider location="perps_home" analyticsSource={SOURCE}>
      <Box twClassName="gap-6">
        <SocialV1FeedPostList
          posts={posts.slice(0, PERPS_TRENDING_POST_COUNT)}
          dividerKeyPrefix="perps-home-trending"
          renderPost={renderPost}
        />
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default PerpsSocialTrending;
