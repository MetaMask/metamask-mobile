/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandardAnimated,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
import {
  buildFollowTradingTokenContext,
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
  type TraderProfileScreenViewedSource,
} from '../analytics';

import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import TraderHeaderIdentity from '../components/TraderHeaderIdentity';
import TraderMuteChip from '../components/TraderMuteChip';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import { useTraderMuteActions } from '../hooks/useTraderMuteActions';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import { shareSocialProfile } from '../navigation/socialTraderDeeplink';
import ProfilePostsEmptyState from '../MyProfileView/components/ProfilePostsEmptyState';
import { useMyProfilePosts } from '../MyProfileView/hooks/useMyProfilePosts';
import ProfilePostsLoadingState from '../shared/ProfilePostsLoadingState';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import SocialV1FeedPostList from '../../../UI/SocialFeed/components/SocialV1FeedPostList';
import {
  HYPERLIQUID_CHAIN_NAME,
  isPerpPosition,
} from '../../../UI/SocialFeed/utils/perp';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import PositionRow from './components/PositionRow';
import ProfileHeader from './components/ProfileHeader';
import {
  PositionRowSkeleton,
  ProfileHeaderSkeleton,
  StatsRowSkeleton,
} from './components/Skeletons';
import SortButton from './components/SortButton';
import StatsRow from './components/StatsRow';
import ProfileOptionsSheet from './components/ProfileOptionsSheet';
import TraderProfileCompactStats from './components/TraderProfileCompactStats';
import TraderStatsSheet from './components/TraderStatsSheet';
import type { TraderProfileWithSheetStats } from './types/traderProfileStatsSheet';
import { useTraderBlock, useTraderPositions, useTraderProfile } from './hooks';
import { resolveQuickBuyOriginalEntryPointFromProfile } from '../../../UI/QuickBuy/analytics';
import {
  CLOSED_SORT_CYCLE,
  OPEN_SORT_CYCLE,
  sortPositions,
  type ClosedSortKey,
  type OpenSortKey,
  type SortKey,
} from './utils/sortPositions';

const POSITION_SKELETON_COUNT = 4;
const POSITION_SKELETON_KEYS = Array.from(
  { length: POSITION_SKELETON_COUNT },
  (_, i) => `position-skeleton-${i}`,
);

const OPEN_SORT_LABEL_KEYS: Record<OpenSortKey, string> = {
  value: 'social_leaderboard.trader_profile.sort.value',
  pnl: 'social_leaderboard.trader_profile.sort.pnl_percent',
  recent: 'social_leaderboard.trader_profile.sort.recent',
};

const CLOSED_SORT_LABEL_KEYS: Record<ClosedSortKey, string> = {
  value: 'social_leaderboard.trader_profile.sort.top_trades',
  pnl: 'social_leaderboard.trader_profile.sort.pnl_percent',
  recent: 'social_leaderboard.trader_profile.sort.recent',
};

const getPositionListKey = (position: Position): string =>
  position.positionId ?? `${position.tokenAddress}-${position.chain}`;

const PROFILE_TABS = ['open', 'closed', 'posts'] as const;
const END_REACHED_THRESHOLD_PX = 600;

type TraderProfileTab = (typeof PROFILE_TABS)[number];

const PROFILE_TAB_TEST_IDS: Record<
  TraderProfileTab,
  (typeof TraderProfileViewSelectorsIDs)[
    | 'TAB_OPEN'
    | 'TAB_CLOSED'
    | 'TAB_POSTS']
> = {
  open: TraderProfileViewSelectorsIDs.TAB_OPEN,
  closed: TraderProfileViewSelectorsIDs.TAB_CLOSED,
  posts: TraderProfileViewSelectorsIDs.TAB_POSTS,
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderProfileView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderProfileView'>>();
  const tw = useTailwind();
  const {
    traderId,
    traderName,
    traderAddress: traderAddressParam,
    source: sourceParam,
    traderRank,
  } = route.params;
  const source = (sourceParam ??
    'deep_link') as TraderProfileScreenViewedSource;
  const { track } = useSocialLeaderboardAnalytics();
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);

  const {
    profile,
    isLoading,
    error: profileError,
    isFollowing,
    toggleFollow,
    refresh,
  } = useTraderProfile(traderId, { refetchInterval: 30_000 });
  const { isBlocked, block, unblock } = useTraderBlock(
    profile?.profile.profileId,
  );
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    refetch: refetchPositions,
  } = useTraderPositions(traderId, {
    refetchInterval: isBlocked ? undefined : 30_000,
  });
  const [activeTab, setActiveTab] = useState<TraderProfileTab>('open');
  const {
    posts,
    isLoading: isPostsLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error: postsError,
    refresh: refreshPosts,
  } = useMyProfilePosts(traderId, {
    isActive: activeTab === 'posts' && !isBlocked,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatsSheetOpen, setIsStatsSheetOpen] = useState(false);
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false);

  const traderAddress = traderAddressParam ?? profile?.profile.address ?? '';

  // The headline 7D return reflects the trader's PnL across every enabled
  // asset class they traded. When perps are enabled this includes Hyperliquid.
  // Summing the per-chain 7D breakdown is preferred over the global stats.pnl7d;
  // fall back to the global value only when no per-chain breakdown is available
  // (e.g. an older social-api that doesn't return perChainPnl7d).
  const headlineStats = useMemo(() => {
    if (!profile) return null;
    const perChainPnl7d = profile.perChainBreakdown?.perChainPnl7d;
    if (!perChainPnl7d || Object.keys(perChainPnl7d).length === 0) {
      return profile.stats;
    }
    const pnl7d = Object.entries(perChainPnl7d).reduce(
      (sum, [chain, value]) =>
        !isPerpsEnabled && chain.toLowerCase() === HYPERLIQUID_CHAIN_NAME
          ? sum
          : sum + (value ?? 0),
      0,
    );
    return { ...profile.stats, pnl7d };
  }, [profile, isPerpsEnabled]);
  // Fire Trader Profile Screen Viewed once profile resolves so we have an
  // accurate trader_address / is_following at the point the user lands.
  const hasFiredScreenViewedRef = useRef(false);
  useEffect(() => {
    if (hasFiredScreenViewedRef.current) return;
    if (!profile) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
        traderAddress || profile.profile.address,
      [SocialLeaderboardEventProperties.TRADER_USERNAME]: profile.profile.name,
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.IS_FOLLOWING]: isFollowing,
      [SocialLeaderboardEventProperties.TRADER_RANK]: traderRank,
    });
  }, [profile, traderAddress, source, isFollowing, traderRank, track]);

  const { isChipMuted, showMuteChip, onMutePress } = useTraderMuteActions();
  const { followWithSetup } = useFollowWithNotificationSetup();
  const handleMutePress = useCallback(
    () => onMutePress(traderId),
    [onMutePress, traderId],
  );

  const positionTabs = useMemo<TabItem[]>(
    () =>
      PROFILE_TABS.map((tab) => ({
        key: tab,
        label:
          tab === 'posts'
            ? strings('social_leaderboard.my_profile.posts')
            : strings(`social_leaderboard.trader_profile.${tab}`),
        content: null,
        testID: PROFILE_TAB_TEST_IDS[tab],
      })),
    [],
  );
  const [openSort, setOpenSort] = useState<OpenSortKey>('value');
  const [closedSort, setClosedSort] = useState<ClosedSortKey>('value');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleShareProfile = useCallback(() => {
    shareSocialProfile(traderId);
  }, [traderId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    playImpact(ImpactMoment.PullToRefresh);
    try {
      // Both hooks rethrow after logging; allSettled keeps one failure from
      // taking down the other refetch and prevents an unhandled rejection
      // from surfacing in the UI.
      await Promise.allSettled([refresh(), refetchPositions(), refreshPosts()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, refetchPositions, refreshPosts]);

  const handleFollowPress = useCallback(
    async () =>
      followWithSetup(isFollowing, () =>
        toggleFollow({
          source: 'trader_profile',
          traderAddress: traderAddress || profile?.profile.address || '',
          traderUsername: profile?.profile.name,
          traderAvatarUri: profile?.profile.imageUrl,
          // Rank only meaningful when arriving from a ranked surface; omit on
          // trader_profile to keep schema clean.
        }),
      ),
    [toggleFollow, traderAddress, profile, isFollowing, followWithSetup],
  );

  const handleOpenProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(true);
  }, []);

  const handleCloseProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(false);
  }, []);

  const handleBlock = useCallback(async () => {
    const wasFollowing = isFollowing;
    const didBlock = await block();
    if (didBlock && wasFollowing) {
      await toggleFollow({
        source: 'trader_profile',
        traderAddress: traderAddress || profile?.profile.address || '',
        traderUsername: profile?.profile.name,
        traderAvatarUri: profile?.profile.imageUrl,
      });
    }
  }, [block, isFollowing, toggleFollow, traderAddress, profile]);

  const handleUnblock = useCallback(async () => {
    playImpact(ImpactMoment.FollowToggle).catch(() => undefined);
    await unblock();
  }, [unblock]);

  const handleTabChange = useCallback(
    (tab: TraderProfileTab) => {
      if (activeTab === tab) return;
      setActiveTab(tab);
      if (traderAddress && tab !== 'posts') {
        queueMicrotask(() => {
          track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_TAB_CHANGED, {
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
            [SocialLeaderboardEventProperties.TAB]: tab,
          });
        });
      }
    },
    [activeTab, traderAddress, track],
  );

  const handlePositionTabPress = useCallback(
    (index: number) => {
      const tab = PROFILE_TABS[index];
      if (!tab) return;
      handleTabChange(tab);
    },
    [handleTabChange],
  );

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handlePositionPress = useCallback(
    (position: Position) => {
      const isOpenTab = activeTabRef.current === 'open';
      const context = buildFollowTradingTokenContext(position, traderAddress);
      if (context) {
        track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_POSITION_CLICKED, {
          ...context,
          [SocialLeaderboardEventProperties.IS_OPEN]: isOpenTab,
        });
      }
      navigation.navigate(Routes.SOCIAL.POSITION, {
        traderId,
        traderName,
        traderImageUrl: profile?.profile.imageUrl ?? undefined,
        traderAddress: traderAddress || undefined,
        tokenSymbol: position.tokenSymbol,
        position,
        source: 'profile_position',
        originalEntryPoint:
          resolveQuickBuyOriginalEntryPointFromProfile(source),
        isClosed: !isOpenTab,
      });
    },
    [
      navigation,
      traderId,
      traderName,
      profile?.profile.imageUrl,
      traderAddress,
      source,
      track,
    ],
  );
  const tabPositions = activeTab === 'open' ? openPositions : closedPositions;
  const positions = useMemo(
    () =>
      isPerpsEnabled
        ? tabPositions
        : tabPositions.filter((position) => !isPerpPosition(position)),
    [isPerpsEnabled, tabPositions],
  );
  const isLoadingPositions =
    activeTab === 'open' ? isLoadingOpen : isLoadingClosed;

  const currentSortKey: SortKey = activeTab === 'open' ? openSort : closedSort;
  const sortedPositions = useMemo(
    () =>
      activeTab === 'posts'
        ? []
        : sortPositions(positions, currentSortKey, activeTab),
    [activeTab, positions, currentSortKey],
  );
  const showPostsEmptyState =
    !isPostsLoading && posts.length === 0 && !postsError;

  const handleSortPress = useCallback(() => {
    // Fire-and-forget haptic; ignore rejection (unsupported platforms).
    playSelection().catch(() => undefined);
    if (activeTab === 'open') {
      setOpenSort((current) => {
        const idx = OPEN_SORT_CYCLE.indexOf(current);
        return OPEN_SORT_CYCLE[(idx + 1) % OPEN_SORT_CYCLE.length];
      });
    } else {
      setClosedSort((current) => {
        const idx = CLOSED_SORT_CYCLE.indexOf(current);
        return CLOSED_SORT_CYCLE[(idx + 1) % CLOSED_SORT_CYCLE.length];
      });
    }
  }, [activeTab]);

  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

  const handlePostsScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (activeTab !== 'posts' || !hasNextPage) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd <= END_REACHED_THRESHOLD_PX) {
        loadMore();
      }
    },
    [activeTab, hasNextPage, loadMore],
  );

  const headerTitle = profile?.profile.name;

  const renderStats = (): React.ReactNode => {
    if (isBlocked) {
      return null;
    }
    if (headlineStats) {
      return (
        <StatsRow
          stats={headlineStats}
          holdTimeMinutes={profile?.stats.medianHoldMinutes}
          onPress={() => setIsStatsSheetOpen(true)}
        />
      );
    }
    return <StatsRowSkeleton />;
  };

  const renderPostsContent = (): React.ReactNode => {
    if (isPostsLoading && posts.length === 0) {
      return <ProfilePostsLoadingState />;
    }
    if (showPostsEmptyState) {
      return <ProfilePostsEmptyState />;
    }
    if (postsError && posts.length === 0) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full px-4 py-16 gap-3"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.feed.error.title')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => {
              refreshPosts().catch(() => undefined);
            }}
            twClassName="self-center"
          >
            {strings('social_leaderboard.feed.error.retry')}
          </Button>
        </Box>
      );
    }
    return (
      <Box paddingTop={4}>
        <SocialV1FeedPostList
          posts={posts}
          dividerKeyPrefix="trader-profile"
          renderPost={(post) => <SocialFeedPostShell post={post} />}
        />
        {isFetchingNextPage ? (
          <Box alignItems={BoxAlignItems.Center} twClassName="px-4">
            <ActivityIndicator size="small" />
          </Box>
        ) : null}
      </Box>
    );
  };

  const renderPositionsContent = (): React.ReactNode => {
    if (isLoadingPositions && positions.length === 0) {
      return POSITION_SKELETON_KEYS.map((key) => (
        <PositionRowSkeleton key={key} />
      ));
    }
    if (sortedPositions.length === 0) {
      return (
        <ProfilePostsEmptyState
          message={strings(
            activeTab === 'closed'
              ? 'social_leaderboard.my_profile.empty_closed'
              : 'social_leaderboard.my_profile.empty_open',
          )}
        />
      );
    }
    return sortedPositions.map((position) => (
      <PositionRow
        key={getPositionListKey(position)}
        position={position}
        onPress={handlePositionPress}
        isClosed={activeTab === 'closed'}
        showTradeDate={currentSortKey === 'recent'}
      />
    ));
  };

  const renderBlockedState = (): React.ReactNode => (
    <Box alignItems={BoxAlignItems.Center} twClassName="px-6 pt-12">
      <TabEmptyState
        icon={
          <>
            <Icon
              name={IconName.Ban}
              size={IconSize.Lg}
              color={IconColor.IconAlternative}
            />
            <Text variant={TextVariant.HeadingSm} twClassName="text-center">
              {strings('social_leaderboard.trader_profile.blocked_title', {
                name: profile?.profile.name ?? '',
              })}
            </Text>
          </>
        }
        description={strings(
          'social_leaderboard.trader_profile.blocked_description',
        )}
        twClassName="max-w-80"
        testID={TraderProfileViewSelectorsIDs.BLOCKED_STATE}
      />
    </Box>
  );

  const renderActivityContent = (): React.ReactNode => {
    if (isBlocked) {
      return renderBlockedState();
    }
    return (
      <>
        <Box twClassName="h-px bg-muted mx-4 mt-5 mb-4" />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-2"
        >
          <Box twClassName="flex-1">
            <TabsBar
              tabs={positionTabs}
              activeIndex={PROFILE_TABS.indexOf(activeTab)}
              onTabPress={handlePositionTabPress}
            />
          </Box>
          {activeTab !== 'posts' && positions.length > 0 && (
            <Box twClassName="pr-4">
              <SortButton
                label={strings(
                  activeTab === 'open'
                    ? OPEN_SORT_LABEL_KEYS[openSort]
                    : CLOSED_SORT_LABEL_KEYS[closedSort],
                )}
                onPress={handleSortPress}
                testID={TraderProfileViewSelectorsIDs.SORT_BUTTON}
              />
            </Box>
          )}
        </Box>
        {activeTab === 'posts'
          ? renderPostsContent()
          : renderPositionsContent()}
      </>
    );
  };

  return (
    // Top and bottom edges are deliberately off — see
    // `SCROLLABLE_SCREEN_SAFE_AREA_EDGES`. The top inset comes from
    // `includesTopInset` (JS `marginTop` off the already resolved provider).
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={TraderProfileViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardAnimated
        includesTopInset
        scrollY={scrollYShared}
        titleSectionHeight={titleSectionHeightSv}
        title={
          headerTitle && profile ? (
            <TraderHeaderIdentity
              traderName={headerTitle}
              traderImageUrl={profile.profile.imageUrl}
              traderAddress={profile.profile.address}
              variant="compact"
              testID={TraderProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY}
            />
          ) : undefined
        }
        subtitle={
          headlineStats && !isBlocked ? (
            <TraderProfileCompactStats stats={headlineStats} />
          ) : undefined
        }
        onBack={handleBack}
        backButtonProps={{
          testID: TraderProfileViewSelectorsIDs.BACK_BUTTON,
        }}
        endAccessory={
          <SocialHeaderGlassSurface twClassName="px-1">
            <ButtonIcon
              iconName={IconName.Share}
              iconProps={{ color: IconColor.IconDefault }}
              size={ButtonIconSize.Md}
              onPress={handleShareProfile}
              accessibilityLabel={strings(
                'social_leaderboard.my_profile.share_profile',
              )}
              testID={TraderProfileViewSelectorsIDs.SHARE_BUTTON}
            />
            <ButtonIcon
              iconName={IconName.MoreHorizontal}
              iconProps={{ color: IconColor.IconDefault }}
              size={ButtonIconSize.Md}
              onPress={handleOpenProfileOptions}
              isDisabled={!profile}
              accessibilityLabel={strings(
                'social_leaderboard.trader_profile.more_options',
              )}
              testID={TraderProfileViewSelectorsIDs.MORE_BUTTON}
            />
          </SocialHeaderGlassSurface>
        }
        testID={TraderProfileViewSelectorsIDs.HEADER}
      />

      <Box twClassName="flex-1">
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          onScroll={onScroll}
          onMomentumScrollEnd={handlePostsScrollSettled}
          onScrollEndDrag={handlePostsScrollSettled}
          scrollEventThrottle={16}
          testID={TraderProfileViewSelectorsIDs.SCROLL}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              testID={TraderProfileViewSelectorsIDs.REFRESH_CONTROL}
            />
          }
        >
          {!isLoading && profileError && !profile ? (
            <Box testID={TraderProfileViewSelectorsIDs.ERROR_BANNER}>
              <ErrorState
                title={strings(
                  'social_leaderboard.trader_profile.error_loading_profile',
                )}
                onRetry={refresh}
              />
            </Box>
          ) : (
            <>
              <Box
                testID={TraderProfileViewSelectorsIDs.TITLE_SECTION_WRAPPER}
                onLayout={(e) =>
                  setTitleSectionHeight(e.nativeEvent.layout.height)
                }
              >
                {isLoading && !profile ? (
                  <>
                    <ProfileHeaderSkeleton />
                    <StatsRowSkeleton />
                  </>
                ) : profile ? (
                  <>
                    <ProfileHeader
                      profile={profile.profile}
                      twitterHandle={profile.socialHandles?.twitter}
                    />
                    {renderStats()}
                  </>
                ) : null}
              </Box>

              {profile && (
                <>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="px-4 pt-3 pb-1"
                  >
                    <Box twClassName="flex-1">
                      {isBlocked ? (
                        <Button
                          variant={ButtonVariant.Secondary}
                          isFullWidth
                          onPress={handleUnblock}
                          testID={TraderProfileViewSelectorsIDs.UNBLOCK_BUTTON}
                        >
                          {strings('social_leaderboard.trader_profile.unblock')}
                        </Button>
                      ) : (
                        <Button
                          variant={
                            isFollowing
                              ? ButtonVariant.Secondary
                              : ButtonVariant.Primary
                          }
                          isFullWidth
                          onPress={handleFollowPress}
                          testID={TraderProfileViewSelectorsIDs.FOLLOW_BUTTON}
                        >
                          {isFollowing
                            ? strings('social_leaderboard.following')
                            : strings('social_leaderboard.follow')}
                        </Button>
                      )}
                    </Box>
                    {showMuteChip && (
                      <TraderMuteChip
                        isMuted={isChipMuted(traderId)}
                        visible={isFollowing}
                        onPress={handleMutePress}
                        traderName={profile?.profile.name}
                        testID={TraderProfileViewSelectorsIDs.MUTE_CHIP}
                      />
                    )}
                  </Box>

                  {renderActivityContent()}
                </>
              )}
            </>
          )}
        </Animated.ScrollView>
      </Box>
      {isStatsSheetOpen && profile ? (
        <TraderStatsSheet
          profile={profile as TraderProfileWithSheetStats}
          onClose={() => setIsStatsSheetOpen(false)}
        />
      ) : null}
      {isProfileOptionsOpen && profile ? (
        <ProfileOptionsSheet
          traderName={profile.profile.name}
          onBlock={handleBlock}
          onClose={handleCloseProfileOptions}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default TraderProfileView;
