import { Box } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { type ScrollHandlerProcessed } from 'react-native-reanimated';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { playSelection } from '../../../../util/haptics';
import { useMyProfile } from '../MyProfileView/hooks';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import SocialFeedCanonical, {
  type SocialFeedCanonicalScope,
} from '../../../UI/SocialFeed/components/SocialFeedCanonical';
import type { SocialFeedPostShellProps } from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import type {
  SocialFeedPageHandle,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import type { SocialShellFilters } from '../shell/filters/types';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';

export interface SocialV1CanonicalTabViewProps {
  tab: 'trending' | 'following';
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  appliedFilters?: SocialShellFilters;
  containerTestID: string;
  scrollTestID: string;
}

const SocialV1CanonicalTabView: React.FC<SocialV1CanonicalTabViewProps> = ({
  tab,
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  onCopyTrade,
  containerTestID,
  scrollTestID,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();

  const handleAuthorPress = useCallback(
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

  const handlePositionPress = useCallback(
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

  const scope: SocialFeedCanonicalScope = tab;

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterTestID={
          tab === 'following'
            ? SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON
            : SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON
        }
      >
        <Box />
      </SocialTabFilterBar>
      <SocialFeedCanonical
        scope={scope}
        scrollMode="virtualized"
        realtime={false}
        location={tab === 'trending' ? 'social_trending' : 'social_following'}
        onScroll={onScroll}
        pageRef={pageRef}
        onAuthorPress={handleAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={handlePositionPress}
        testID={`${containerTestID}-feed`}
        scrollTestID={scrollTestID}
      />
    </Box>
  );
};

export default SocialV1CanonicalTabView;
