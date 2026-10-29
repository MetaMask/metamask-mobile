import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { playSelection } from '../../../../util/haptics';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { useMyProfile } from '../MyProfileView/hooks';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';

export interface SocialFeedPostNavigation {
  /** Opens the author's Social V1 profile. */
  onAuthorPress: (post: SocialV1FeedPost) => void;
  /** Opens the position sheet. A post without a position is ignored. */
  onPositionPress: (post: SocialV1FeedPost) => void;
}

/** Where a Social V1 tab's feed post goes when its author or card is tapped. */
export const useSocialFeedPostNavigation = (): SocialFeedPostNavigation => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();

  const onAuthorPress = useCallback(
    (post: SocialV1FeedPost) => {
      playSelection().catch(() => undefined);
      navigateToSocialV1Profile(navigation, {
        traderId: post.item.author.id,
        traderName: post.authorHandle,
        traderAddress: post.item.author.address,
        traderAvatarUri:
          post.authorImageUrl ?? post.item.author.avatarUri ?? undefined,
        source: 'trader_feed',
        viewerProfileId: myProfile?.profileId ?? undefined,
        viewerAddress: myProfile?.linkedAccountAddress ?? undefined,
      });
    },
    [myProfile, navigation],
  );

  const onPositionPress = useCallback(
    (post: SocialV1FeedPost) => {
      if (!post.position) {
        return;
      }
      playSelection().catch(() => undefined);
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

  return useMemo(
    () => ({ onAuthorPress, onPositionPress }),
    [onAuthorPress, onPositionPress],
  );
};
