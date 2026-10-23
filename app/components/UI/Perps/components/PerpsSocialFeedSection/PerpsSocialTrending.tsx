import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
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
import { useMyProfile } from '../../../../Views/SocialLeaderboard/MyProfileView/hooks';
import {
  getSocialReactionType,
  SocialEventValues,
  type SocialEventSource,
  type SocialTradeType,
  useSocialV1Analytics,
} from '../../../../Views/SocialLeaderboard/analytics';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

export const PERPS_TRENDING_POST_COUNT = 3;

const PERPS_TRENDING_SOURCE: SocialFeedSource = {
  kind: 'all',
  audience: 'all',
  assetClass: 'perps',
};

interface PerpsSocialTrendingProps {
  /** Scope to one perp market (raw symbol); omit for trending across all perps. */
  symbol?: string;
  postCount?: number;
  source?: Extract<SocialEventSource, 'perps_home' | 'perp_asset_screen'>;
  /** Renders a See more button under the posts when set. */
  onSeeMorePress?: () => void;
}

const PerpsSocialTrending: React.FC<PerpsSocialTrendingProps> = ({
  symbol,
  postCount = PERPS_TRENDING_POST_COUNT,
  source = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
  onSeeMorePress,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const { trackInteraction } = useSocialV1Analytics();
  const feedSource = useMemo<SocialFeedSource>(
    () => (symbol ? { kind: 'perp', symbol } : PERPS_TRENDING_SOURCE),
    [symbol],
  );
  const { posts, isLoading, error, refresh } = useSocialFeed(feedSource, {
    pageSize: postCount,
  });

  const handleAuthorPress = useCallback(
    (post: SocialV1FeedPost) => {
      trackInteraction({
        interaction_type: SocialEventValues.INTERACTION_TYPE.TAP,
        screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
        source,
      });
      navigateToSocialV1Profile(navigation, {
        traderId: post.item.author.id,
        traderName: post.authorHandle,
        traderAddress: post.item.author.address,
        traderAvatarUri:
          post.authorImageUrl ?? post.item.author.avatarUri ?? undefined,
        source,
        viewerProfileId: myProfile?.profileId ?? undefined,
        viewerAddress: myProfile?.linkedAccountAddress ?? undefined,
      });
    },
    [navigation, myProfile, source, trackInteraction],
  );

  const handlePositionPress = useCallback(
    (post: SocialV1FeedPost) => {
      if (!post.position) {
        return;
      }
      trackInteraction({
        interaction_type: SocialEventValues.INTERACTION_TYPE.TAP,
        screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
        source,
        trade_type:
          post.item.variant === 'perpsOpen' ||
          post.item.variant === 'perpsClosed'
            ? SocialEventValues.TRADE_TYPE.PERPS
            : SocialEventValues.TRADE_TYPE.SPOT,
      });
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
    [navigation, source, trackInteraction],
  );

  const handleReactionInteraction = useCallback(
    (action: 'added' | 'removed', emotion: string) => {
      const reactionType = getSocialReactionType(emotion);
      if (!reactionType) {
        return;
      }
      trackInteraction({
        interaction_type:
          action === 'added'
            ? SocialEventValues.INTERACTION_TYPE.REACTION_ADDED
            : SocialEventValues.INTERACTION_TYPE.REACTION_REMOVED,
        screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
        source,
        reaction_type: reactionType,
      });
    },
    [source, trackInteraction],
  );

  const handleReactionPickerOpened = useCallback(() => {
    trackInteraction({
      interaction_type:
        SocialEventValues.INTERACTION_TYPE.REACTION_PICKER_OPENED,
      screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
      source,
    });
  }, [source, trackInteraction]);

  const handleCopyTradeInteraction = useCallback(
    (tradeType: SocialTradeType) => {
      trackInteraction({
        interaction_type: SocialEventValues.INTERACTION_TYPE.COPY_TRADE_TAPPED,
        screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
        source,
        trade_type: tradeType,
      });
    },
    [source, trackInteraction],
  );

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostShell
        post={post}
        onAuthorPress={handleAuthorPress}
        onPositionPress={post.position ? handlePositionPress : undefined}
        onReactionInteraction={handleReactionInteraction}
        onReactionPickerOpened={handleReactionPickerOpened}
        onCopyTradeInteraction={handleCopyTradeInteraction}
      />
    ),
    [
      handleAuthorPress,
      handleCopyTradeInteraction,
      handlePositionPress,
      handleReactionInteraction,
      handleReactionPickerOpened,
    ],
  );

  if (isLoading && posts.length === 0) {
    return (
      <Box twClassName="gap-6">
        <SocialFeedSkeleton count={postCount} />
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
    <>
      <Box twClassName="gap-6">
        <SocialV1FeedPostList
          posts={posts.slice(0, postCount)}
          dividerKeyPrefix="perps-home-trending"
          renderPost={renderPost}
        />
      </Box>
      {onSeeMorePress ? (
        <Box twClassName="px-4 pt-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            isFullWidth
            onPress={onSeeMorePress}
            testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TRENDING_SEE_MORE}
          >
            {strings('perps.home.see_more')}
          </Button>
        </Box>
      ) : null}
    </>
  );
};

export default PerpsSocialTrending;
