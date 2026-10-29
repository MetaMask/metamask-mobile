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
  IconColor,
  IconName,
  Spinner,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  AppStackNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { playSelection } from '../../../../util/haptics';
import { useTheme } from '../../../../util/theme';
import { shareSocialProfile } from '../navigation/socialTraderDeeplink';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import TraderMuteChip from '../components/TraderMuteChip';
import { useFollowedTraders } from '../NotificationPreferences/hooks';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import { useOpenSocialPostComposer } from '../hooks/useOpenSocialPostComposer';
import { useTraderMuteActions } from '../hooks/useTraderMuteActions';
import { consumePostsTabFocus } from '../pendingPosts/pendingPostsStore';
import {
  useTraderPositions,
  useTraderProfile,
} from '../TraderProfileView/hooks';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import ProfilePostsLoadingState from '../shared/ProfilePostsLoadingState';
import SocialV1FeedPostList from '../../../UI/SocialFeed/components/SocialV1FeedPostList';
import { isPerpPosition } from '../../../UI/SocialFeed/utils/perp';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import MyProfileHeader from './components/MyProfileHeader';
import MyProfileCompactStats from './components/MyProfileCompactStats';
import MyProfilePerformanceStats from './components/MyProfilePerformanceStats';
import ProfilePostsEmptyState from './components/ProfilePostsEmptyState';
import ProfilePositionsTab from './components/ProfilePositionsTab';
import ProfileAvatar from './components/ProfileAvatar';

import TraderHeaderIdentity from '../components/TraderHeaderIdentity';

import { useMyProfile, useMyProfileAddress, useMyProfilePosts } from './hooks';
import { overlayMyProfileLiveStats } from './utils/overlayMyProfileLiveStats';
import { traderProfileResponseToMySocialProfile } from './utils/traderProfileResponseToMySocialProfile';
import type { MySocialProfile } from './hooks/useMyProfile';
import type { ProfileAssetFilter } from './utils/splitPositionsByType';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';

const { Filter, Interaction, Screen, Trade } = SocialEvent;
const PROFILE_CONTENT_TABS = ['open', 'closed', 'posts'] as const;
type ProfileContentTab = (typeof PROFILE_CONTENT_TABS)[number];

const END_REACHED_THRESHOLD_PX = 600;
const REFRESH_MIN_DURATION_MS = 1000;

const MyProfileView: React.FC = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'MyProfileView' | 'SocialV1ProfileView'>
    >();
  const traderId = route.params?.traderId;
  const traderName = route.params?.traderName;
  const traderAddress = route.params?.traderAddress;
  const traderAvatarUri = route.params?.traderAvatarUri;
  const tw = useTailwind();
  const { colors } = useTheme();
  const { profile: myProfile, isLoading, error, refresh } = useMyProfile();
  const { openComposer } = useOpenSocialPostComposer();
  const isOwner =
    !traderId ||
    traderId === myProfile?.profileId ||
    Boolean(
      traderAddress &&
        myProfile?.linkedAccountAddress &&
        traderAddress.toLowerCase() ===
          myProfile.linkedAccountAddress.toLowerCase(),
    );
  const { traders: following } = useFollowedTraders();
  const ownerAddressOrId = useMyProfileAddress(myProfile);
  const addressOrId = isOwner ? ownerAddressOrId : (traderId ?? traderAddress);
  const liveProfile = useTraderProfile(addressOrId ?? '');
  const {
    refresh: refreshLiveProfile,
    isFollowing,
    toggleFollow,
  } = liveProfile;
  const { followWithSetup } = useFollowWithNotificationSetup();
  const { isChipMuted, showMuteChip, onMutePress } = useTraderMuteActions();
  const displayProfile = useMemo((): MySocialProfile | null => {
    if (isOwner) {
      return myProfile;
    }
    if (liveProfile.profile) {
      return traderProfileResponseToMySocialProfile(liveProfile.profile, {
        handle: traderName,
        imageUrl: traderAvatarUri,
      });
    }
    if (!traderId) {
      return null;
    }
    return {
      profileId: traderId,
      displayName: traderName ?? traderId,
      handle: traderName ?? traderId,
      linkedAccountAddress: traderAddress,
      imageUrl: traderAvatarUri,
    };
  }, [
    isOwner,
    liveProfile.profile,
    myProfile,
    traderAddress,
    traderAvatarUri,
    traderId,
    traderName,
  ]);
  const trackInteraction = useSocialScreenAnalytics(Screen.MY_PROFILE, {
    state: [isLoading, Boolean(error), Boolean(displayProfile)],
    isActive: isOwner,
  });
  const muteProfileId = isOwner ? undefined : displayProfile?.profileId;
  const [activeTab, setActiveTab] = useState<ProfileContentTab>('posts');
  const profileTabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'open',
        label: strings('social_leaderboard.trader_profile.open'),
        content: null,
        testID: MyProfileViewSelectorsIDs.OPEN_TAB,
      },
      {
        key: 'closed',
        label: strings('social_leaderboard.trader_profile.closed'),
        content: null,
        testID: MyProfileViewSelectorsIDs.CLOSED_TAB,
      },
      {
        key: 'posts',
        label: strings('social_leaderboard.my_profile.posts'),
        content: null,
        testID: MyProfileViewSelectorsIDs.POSTS_TAB,
      },
    ],
    [],
  );
  const handleProfileTabPress = useCallback((index: number) => {
    const nextTab = PROFILE_CONTENT_TABS[index];
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, []);
  const scrollRef = useRef<Animated.ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      // Every new post lands here, pinned at the top of the Posts tab.
      if (isOwner && consumePostsTabFocus()) {
        setActiveTab('posts');
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }, [isOwner]),
  );
  const {
    posts,
    isLoading: isPostsLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error: postsError,
    refresh: refreshPosts,
  } = useMyProfilePosts(addressOrId, {
    ownerProfileId: isOwner ? myProfile?.profileId : undefined,
    isActive: activeTab === 'posts',
  });
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError: openPositionsError,
    closedError: closedPositionsError,
    refetch: refetchPositions,
  } = useTraderPositions(addressOrId ?? '');
  const [assetFilter, setAssetFilter] = useState<ProfileAssetFilter>('all');
  const overlayedStats = useMemo(
    () =>
      displayProfile
        ? overlayMyProfileLiveStats(displayProfile, liveProfile.profile)
        : null,
    [displayProfile, liveProfile.profile],
  );
  const [refreshing, setRefreshing] = useState(false);
  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE);
  }, [navigation]);
  const handleEditAvatar = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.EDIT_AVATAR);
  }, [navigation]);
  const handleFollowersPress = useCallback(() => {
    if (!isOwner && !addressOrId) {
      return;
    }
    navigation.push(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'followers',
      ...(isOwner ? {} : { addressOrId }),
    });
  }, [addressOrId, isOwner, navigation]);
  const handleFollowingPress = useCallback(() => {
    if (!isOwner && !addressOrId) {
      return;
    }
    navigation.push(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'following',
      ...(isOwner ? {} : { addressOrId }),
    });
  }, [addressOrId, isOwner, navigation]);
  const handleOpenComposer = useCallback(() => {
    playSelection().catch(() => undefined);
    openComposer();
  }, [openComposer]);

  const handleCreateProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }, [navigation]);

  const handleShareTraderDeeplink = useCallback(() => {
    if (!traderId) {
      return;
    }
    shareSocialProfile(traderId);
  }, [traderId]);

  const handleShareProfile = useCallback(() => {
    if (!myProfile?.profileId) {
      return;
    }
    shareSocialProfile(myProfile.profileId);
  }, [myProfile?.profileId]);

  const handleFollowPress = useCallback(async () => {
    await followWithSetup(isFollowing, () =>
      toggleFollow({
        source: 'trader_profile',
        traderAddress:
          traderAddress || liveProfile.profile?.profile.address || '',
        traderUsername: displayProfile?.displayName,
        traderAvatarUri: displayProfile?.imageUrl,
      }),
    );
  }, [
    displayProfile,
    followWithSetup,
    isFollowing,
    liveProfile.profile,
    toggleFollow,
    traderAddress,
  ]);

  const handleMutePress = useCallback(() => {
    if (!muteProfileId) {
      return;
    }
    onMutePress(muteProfileId);
  }, [muteProfileId, onMutePress]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    trackInteraction(Interaction.REFRESH);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, REFRESH_MIN_DURATION_MS),
      );
      // refreshLiveProfile rethrows after logging; allSettled keeps one
      // failure from aborting the others and from becoming unhandled.
      await Promise.allSettled([
        refresh(),
        refreshLiveProfile(),
        refreshPosts(),
        refetchPositions(),
        minDuration,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refresh,
    refreshLiveProfile,
    refreshPosts,
    refetchPositions,
    trackInteraction,
  ]);

  const handlePositionsRetry = useCallback(() => {
    refetchPositions().catch(() => undefined);
  }, [refetchPositions]);

  const handleTitleSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setTitleSectionHeight(Math.ceil(event.nativeEvent.layout.height));
    },
    [setTitleSectionHeight],
  );

  const handlePositionPress = useCallback(
    (position: Position) => {
      if (!displayProfile) {
        return;
      }
      trackInteraction(Interaction.TAP, {
        trade_type: isPerpPosition(position) ? Trade.PERPS : Trade.SPOT,
      });
      navigation.navigate(Routes.SOCIAL.POSITION, {
        traderId: displayProfile.profileId,
        traderName: displayProfile.displayName,
        traderImageUrl: displayProfile.imageUrl ?? undefined,
        traderAddress:
          displayProfile.linkedAccountAddress ?? traderAddress ?? undefined,
        tokenSymbol: position.tokenSymbol,
        position,
        source: 'profile_position',
        isClosed: activeTab === 'closed',
      });
    },
    [activeTab, displayProfile, navigation, trackInteraction, traderAddress],
  );
  const handleAssetFilterChange = useCallback(
    (nextFilter: ProfileAssetFilter) => {
      if (nextFilter === assetFilter) {
        return;
      }
      trackInteraction(Interaction.FILTER_APPLIED, {
        filter_name: Filter.PROFILE_ASSET_TYPE,
        previous_filter_value: assetFilter,
        filter_value: nextFilter,
      });
      setAssetFilter(nextFilter);
    },
    [assetFilter, trackInteraction],
  );

  const handleScrollSettled = useCallback(
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

  const showInitialPostSkeletons = isPostsLoading && posts.length === 0;
  const showPostsEmptyState =
    !isPostsLoading && posts.length === 0 && !postsError;

  return (
    <SocialFeedSurfaceProvider
      location="my_profile"
      analyticsEnabled={isOwner}
      showMockedFields
    >
      <SafeAreaView
        edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
        style={tw.style('flex-1 bg-default')}
        testID={MyProfileViewSelectorsIDs.CONTAINER}
      >
        <HeaderStandardAnimated
          includesTopInset
          scrollY={scrollYShared}
          titleSectionHeight={titleSectionHeightSv}
          title={
            displayProfile ? (
              <TraderHeaderIdentity
                traderName={displayProfile.displayName}
                traderImageUrl={displayProfile.imageUrl}
                traderAddress={displayProfile.linkedAccountAddress ?? undefined}
                avatar={
                  isOwner ? (
                    <ProfileAvatar
                      imageUrl={displayProfile.imageUrl}
                      avatarPresetId={displayProfile.avatarPresetId}
                      avatarBackgroundId={displayProfile.avatarBackgroundId}
                      size="xs"
                      testID={MyProfileViewSelectorsIDs.HEADER_COMPACT_AVATAR}
                    />
                  ) : undefined
                }
                variant="compact"
                testID={MyProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY}
              />
            ) : undefined
          }
          subtitle={
            overlayedStats ? (
              <MyProfileCompactStats
                winRateLabel={overlayedStats.winRateLabel}
                isWinRatePositive={overlayedStats.isWinRatePositive}
                pnlLabel={overlayedStats.pnlLabel}
                hasPnl={overlayedStats.hasPnl}
                isPnlPositive={overlayedStats.isPnlPositive}
              />
            ) : undefined
          }
          onBack={handleBack}
          backButtonProps={{ testID: MyProfileViewSelectorsIDs.BACK_BUTTON }}
          endAccessory={
            !isOwner && traderId ? (
              <SocialHeaderGlassSurface twClassName="px-1">
                <ButtonIcon
                  iconName={IconName.Share}
                  iconProps={{ color: IconColor.IconDefault }}
                  size={ButtonIconSize.Md}
                  onPress={handleShareTraderDeeplink}
                  accessibilityLabel={strings(
                    'social_leaderboard.my_profile.share_profile',
                  )}
                  testID={MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON}
                />
              </SocialHeaderGlassSurface>
            ) : isOwner && displayProfile ? (
              <SocialHeaderGlassSurface twClassName="px-1">
                <ButtonIcon
                  iconName={IconName.Edit}
                  iconProps={{ color: IconColor.IconDefault }}
                  size={ButtonIconSize.Md}
                  onPress={handleOpenComposer}
                  accessibilityLabel={strings(
                    'social_leaderboard.my_profile.create_post',
                  )}
                  testID={MyProfileViewSelectorsIDs.CREATE_POST_BUTTON}
                />
              </SocialHeaderGlassSurface>
            ) : undefined
          }
          testID={MyProfileViewSelectorsIDs.HEADER}
        />

        {isLoading && isOwner && !displayProfile ? (
          <Box
            twClassName="flex-1"
            alignItems={BoxAlignItems.Center}
            paddingTop={12}
            testID={MyProfileViewSelectorsIDs.LOADING}
          >
            <Spinner />
          </Box>
        ) : error && isOwner && !displayProfile ? (
          <Box
            twClassName="flex-1"
            alignItems={BoxAlignItems.Center}
            paddingHorizontal={4}
            paddingTop={12}
            gap={4}
            testID={MyProfileViewSelectorsIDs.ERROR}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {error}
            </Text>
            <Button
              variant={ButtonVariant.Secondary}
              onPress={refresh}
              testID={MyProfileViewSelectorsIDs.RETRY_BUTTON}
            >
              {strings('social_leaderboard.my_profile.retry')}
            </Button>
          </Box>
        ) : displayProfile && overlayedStats ? (
          <Animated.ScrollView
            ref={scrollRef}
            testID={MyProfileViewSelectorsIDs.SCROLL}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('flex-grow pb-6')}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollSettled}
            onScrollEndDrag={handleScrollSettled}
            refreshControl={
              <RefreshControl
                colors={[colors.primary.default]}
                tintColor={colors.icon.default}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            <Box
              testID={MyProfileViewSelectorsIDs.TITLE_SECTION_WRAPPER}
              onLayout={handleTitleSectionLayout}
            >
              <MyProfileHeader
                profile={displayProfile}
                overlayedStats={overlayedStats}
                followingCount={
                  isOwner
                    ? following.length
                    : (displayProfile.followingCount ?? 0)
                }
                isOwner={isOwner}
                onEditAvatar={isOwner ? handleEditAvatar : undefined}
                onFollowersPress={handleFollowersPress}
                onFollowingPress={handleFollowingPress}
              />
            </Box>

            <Box
              gap={2}
              paddingHorizontal={4}
              paddingBottom={
                overlayedStats.performanceCells.length === 0 ? 8 : undefined
              }
            >
              {isOwner ? (
                <Box flexDirection={BoxFlexDirection.Row} gap={2}>
                  <Box twClassName="flex-1">
                    <Button
                      variant={ButtonVariant.Secondary}
                      isFullWidth
                      onPress={handleShareProfile}
                      testID={MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON}
                    >
                      {strings('social_leaderboard.my_profile.share_profile')}
                    </Button>
                  </Box>
                  <Box twClassName="flex-1">
                    <Button
                      variant={ButtonVariant.Secondary}
                      isFullWidth
                      onPress={handleEditProfile}
                      testID={MyProfileViewSelectorsIDs.EDIT_PROFILE_BUTTON}
                    >
                      {strings('social_leaderboard.my_profile.edit_profile')}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Box twClassName="flex-1">
                    <Button
                      variant={
                        isFollowing
                          ? ButtonVariant.Secondary
                          : ButtonVariant.Primary
                      }
                      isFullWidth
                      onPress={handleFollowPress}
                      testID={MyProfileViewSelectorsIDs.FOLLOW_BUTTON}
                    >
                      {isFollowing
                        ? strings('social_leaderboard.following')
                        : strings('social_leaderboard.follow')}
                    </Button>
                  </Box>
                  {showMuteChip && muteProfileId ? (
                    <TraderMuteChip
                      isMuted={isChipMuted(muteProfileId)}
                      visible={isFollowing}
                      onPress={handleMutePress}
                      traderName={displayProfile?.displayName}
                      testID={MyProfileViewSelectorsIDs.MUTE_CHIP}
                    />
                  ) : null}
                </Box>
              )}
            </Box>

            <MyProfilePerformanceStats
              cells={overlayedStats.performanceCells}
            />

            <Box twClassName="bg-default mt-5">
              <TabsBar
                tabs={profileTabs}
                activeIndex={PROFILE_CONTENT_TABS.indexOf(activeTab)}
                onTabPress={handleProfileTabPress}
              />
            </Box>

            {activeTab !== 'posts' ? (
              <ProfilePositionsTab
                positions={
                  activeTab === 'open' ? openPositions : closedPositions
                }
                isLoading={
                  activeTab === 'open' ? isLoadingOpen : isLoadingClosed
                }
                error={
                  activeTab === 'open'
                    ? openPositionsError
                    : closedPositionsError
                }
                isClosed={activeTab === 'closed'}
                filter={assetFilter}
                onFilterChange={handleAssetFilterChange}
                onPositionPress={handlePositionPress}
                onRetry={handlePositionsRetry}
              />
            ) : showInitialPostSkeletons ? (
              <ProfilePostsLoadingState />
            ) : showPostsEmptyState ? (
              <ProfilePostsEmptyState />
            ) : postsError && posts.length === 0 ? (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="w-full px-4 py-16 gap-3"
                testID={MyProfileViewSelectorsIDs.POSTS_ERROR}
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                  twClassName="text-center"
                >
                  {strings('social_leaderboard.feed.error.title')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                >
                  {strings('social_leaderboard.feed.error.description')}
                </Text>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Sm}
                  onPress={refreshPosts}
                  twClassName="self-center"
                  testID={MyProfileViewSelectorsIDs.POSTS_RETRY_BUTTON}
                >
                  {strings('social_leaderboard.feed.error.retry')}
                </Button>
              </Box>
            ) : (
              <Box paddingTop={4} testID={MyProfileViewSelectorsIDs.POSTS_LIST}>
                <SocialV1FeedPostList
                  posts={posts}
                  dividerKeyPrefix="my-profile"
                  renderPost={(post) => <SocialFeedPostShell post={post} />}
                />
              </Box>
            )}
            {activeTab === 'posts' && isFetchingNextPage ? (
              <Box
                alignItems={BoxAlignItems.Center}
                twClassName="px-4"
                testID={MyProfileViewSelectorsIDs.POSTS_FOOTER_LOADING}
              >
                <ActivityIndicator size="small" />
              </Box>
            ) : null}
          </Animated.ScrollView>
        ) : (
          <Box
            twClassName="flex-1"
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            paddingHorizontal={4}
            gap={3}
            testID={MyProfileViewSelectorsIDs.NO_PROFILE}
          >
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              twClassName="text-center"
            >
              {strings('social_leaderboard.my_profile.no_profile_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('social_leaderboard.my_profile.no_profile_description')}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              isFullWidth
              onPress={handleCreateProfile}
              testID={MyProfileViewSelectorsIDs.CREATE_PROFILE_BUTTON}
            >
              {strings('social_leaderboard.my_profile.create_profile')}
            </Button>
          </Box>
        )}
      </SafeAreaView>
    </SocialFeedSurfaceProvider>
  );
};

export default MyProfileView;
