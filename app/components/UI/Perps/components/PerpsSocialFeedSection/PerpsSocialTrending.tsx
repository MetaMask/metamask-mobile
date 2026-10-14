import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  SocialFeedEmpty,
  SocialFeedError,
  SocialFeedPostShell,
  SocialFeedSkeleton,
  SocialV1FeedPostList,
  useSocialFeed,
  type SocialFeedSource,
  type SocialV1FeedPost,
} from '../../../SocialFeed';
import { navigateToSocialV1Profile } from '../../../../Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';

export const PERPS_TRENDING_POST_COUNT = 3;

const PERPS_TRENDING_SOURCE: SocialFeedSource = {
  kind: 'all',
  audience: 'all',
  assetClass: 'perps',
};

const PerpsSocialTrending: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
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
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      });
    },
    [navigation],
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
    return <SocialFeedSkeleton count={PERPS_TRENDING_POST_COUNT} />;
  }

  if (error && posts.length === 0) {
    return <SocialFeedError onRetry={() => refresh()} />;
  }

  if (posts.length === 0) {
    return <SocialFeedEmpty />;
  }

  return (
    <SocialV1FeedPostList
      posts={posts.slice(0, PERPS_TRENDING_POST_COUNT)}
      dividerKeyPrefix="perps-home-trending"
      renderPost={renderPost}
    />
  );
};

export default PerpsSocialTrending;
