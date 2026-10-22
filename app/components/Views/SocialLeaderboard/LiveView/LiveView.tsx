import {
  Box,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import Animated, {
  type ScrollHandlerProcessed,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { playSelection } from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import SocialFeedCanonical, {
  type SocialFeedCanonicalHeaderProps,
  type SocialFeedCanonicalScrollHandler,
} from '../../../UI/SocialFeed/components/SocialFeedCanonical';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import PendingPostsButton from './components/PendingPostsButton';
import LiveStreamControls from './components/LiveStreamControls';
import { LiveViewSelectorsIDs } from './LiveView.testIds';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { useMyProfile } from '../MyProfileView/hooks';

const PENDING_POSTS_ZOOM_IN = ZoomIn.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_ZOOM_OUT = ZoomOut.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_FADE_IN = FadeIn.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_FADE_OUT = FadeOut.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);

type LiveStreamState = 'paused' | 'live';
type AnimatedScrollHandler = SocialFeedCanonicalScrollHandler;

export interface LiveViewProps {
  isActive?: boolean;
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  onCopyTrade?: React.ComponentProps<typeof SocialFeedCanonical>['onCopyTrade'];
}

const LiveView: React.FC<LiveViewProps> = ({
  isActive = true,
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  onCopyTrade,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const [streamState, setStreamState] = useState<LiveStreamState>('live');
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  const handleStreamToggle = useCallback(
    (onRevealPending: () => void) => {
      if (streamState === 'paused') {
        onRevealPending();
      }
      setStreamState((previous) => (previous === 'live' ? 'paused' : 'live'));
    },
    [streamState],
  );

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

  const isLive = streamState === 'live';
  const streamLabel = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  const renderHeader = useCallback(
    ({ pendingNewCount, onRevealPending }: SocialFeedCanonicalHeaderProps) => (
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterTestID={LiveViewSelectorsIDs.FILTER_BUTTON}
      >
        <Box twClassName="flex-row items-center gap-2">
          <FilterButton
            isSelected
            variant={FilterButtonVariant.Secondary}
            size={FilterButtonSize.Sm}
            onPress={() => handleStreamToggle(onRevealPending)}
            testID={LiveViewSelectorsIDs.STREAM_BUTTON}
            accessibilityLabel={streamLabel}
            textProps={isLive ? undefined : { twClassName: 'text-muted' }}
            startAccessory={<LiveStreamControls isLive={isLive} />}
          >
            {streamLabel}
          </FilterButton>
          {pendingNewCount > 0 ? (
            <Animated.View
              entering={PENDING_POSTS_FADE_IN}
              exiting={PENDING_POSTS_FADE_OUT}
            >
              <Animated.View
                entering={PENDING_POSTS_ZOOM_IN}
                exiting={PENDING_POSTS_ZOOM_OUT}
              >
                <PendingPostsButton
                  pendingNewCount={pendingNewCount}
                  onPress={onRevealPending}
                  textColor={TextColor.SuccessDefault}
                />
              </Animated.View>
            </Animated.View>
          ) : null}
        </Box>
      </SocialTabFilterBar>
    ),
    [handleStreamToggle, isFilterActive, isLive, onOpenFilters, streamLabel],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SocialFeedCanonical
        enabled={hasBeenActive}
        scope="all"
        scrollMode="virtualized"
        realtime={isActive}
        paused={streamState === 'paused'}
        renderHeader={renderHeader}
        location="social_live"
        onScroll={onScroll}
        pageRef={pageRef}
        onAuthorPress={handleAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={handlePositionPress}
        testID={LiveViewSelectorsIDs.CONTAINER}
        scrollTestID={LiveViewSelectorsIDs.SCROLL_VIEW}
      />
    </Box>
  );
};

export default LiveView;
