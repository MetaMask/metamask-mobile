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
  Icon,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
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
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderStandardAnimatedGlass from '../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
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
import {
  fireImpact,
  ImpactMoment,
  playSelection,
} from '../../../../util/haptics';
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
  useTraderBlock,
  useTraderPositions,
  useTraderProfile,
} from '../TraderProfileView/hooks';
import ProfileOptionsSheet from '../TraderProfileView/components/ProfileOptionsSheet';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
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
import ProfileAssetFilterSheet from './components/ProfileAssetFilterSheet';
import {
  matchesProfileAssetFilter,
  type ProfileAssetFilter,
} from './utils/splitPositionsByType';
import { dropProfileDrawerFromStack } from './utils/dropProfileDrawerFromStack';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';

/** Same 12px slop the home header uses so each icon stays a comfortable tap. */
const HEADER_ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/** Icons sit on glass capsules; the default press fill would cover the material. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const { Filter, Interaction, Screen, Trade } = SocialEvent;
const PROFILE_CONTENT_TABS = ['open', 'closed', 'posts'] as const;
type ProfileContentTab = (typeof PROFILE_CONTENT_TABS)[number];

const END_REACHED_THRESHOLD_PX = 600;
const REFRESH_MIN_DURATION_MS = 1000;

const linkedAddressesMatch = (
  traderAddress: string | null | undefined,
  linkedAccountAddress: string | null | undefined,
): boolean =>
  Boolean(
    linkedAccountAddress &&
      traderAddress?.toLowerCase() === linkedAccountAddress.toLowerCase(),
  );

const profilePositionTab = ({
  activeTab,
  openPositions,
  closedPositions,
  isLoadingOpen,
  isLoadingClosed,
  openError,
  closedError,
}: {
  activeTab: ProfileContentTab;
  openPositions: Position[];
  closedPositions: Position[];
  isLoadingOpen: boolean;
  isLoadingClosed: boolean;
  openError: string | null;
  closedError: string | null;
}) => {
  if (activeTab === 'closed') {
    return {
      positions: closedPositions,
      isLoading: isLoadingClosed,
      error: closedError,
      isClosed: true,
    };
  }
  return {
    positions: openPositions,
    isLoading: isLoadingOpen,
    error: openError,
    isClosed: false,
  };
};

const filteredPostsEmptyKey = (assetFilter: ProfileAssetFilter): string =>
  assetFilter === 'tokens'
    ? 'social_leaderboard.feed.empty_type.tokens.title'
    : 'social_leaderboard.feed.empty_type.perps.title';

interface ProfilePostsContentProps {
  showInitialPostSkeletons: boolean;
  showPostsEmptyState: boolean;
  postsEmptyMessage?: string;
  postsError: string | null;
  visiblePosts: SocialV1FeedPost[];
  onRetry: () => void;
  showCopyTrade: boolean;
}

const ProfilePostsContent = ({
  showInitialPostSkeletons,
  showPostsEmptyState,
  postsEmptyMessage,
  postsError,
  visiblePosts,
  onRetry,
  showCopyTrade,
}: ProfilePostsContentProps) => {
  if (showInitialPostSkeletons) {
    return <ProfilePostsLoadingState />;
  }
  if (showPostsEmptyState) {
    return <ProfilePostsEmptyState message={postsEmptyMessage} />;
  }
  if (postsError && visiblePosts.length === 0) {
    return (
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
          onPress={onRetry}
          twClassName="self-center"
          testID={MyProfileViewSelectorsIDs.POSTS_RETRY_BUTTON}
        >
          {strings('social_leaderboard.feed.error.retry')}
        </Button>
      </Box>
    );
  }

  return (
    <Box paddingTop={4} testID={MyProfileViewSelectorsIDs.POSTS_LIST}>
      <SocialV1FeedPostList
        posts={visiblePosts}
        dividerKeyPrefix="my-profile"
        renderPost={(post) => (
          <SocialFeedPostShell
            post={post}
            requireSocialTerms
            showCopyTrade={showCopyTrade}
          />
        )}
      />
    </Box>
  );
};

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

  // The Profile drawer opens this screen with `navigate`, so the drawer stays
  // beneath it and every back affordance (header, iOS swipe, Android hardware
  // back) would reveal it again. Drop the drawer from the stack so back returns
  // to the tab it was opened from. A no-op when opened from Social.
  useEffect(() => {
    const nextState = dropProfileDrawerFromStack(navigation.getState());
    if (!nextState) {
      return;
    }
    navigation.dispatch(CommonActions.reset(nextState));
  }, [navigation]);

  const tw = useTailwind();
  const { colors } = useTheme();
  const { profile: myProfile, isLoading, error, refresh } = useMyProfile();
  const { openComposer } = useOpenSocialPostComposer();
  const isOwner =
    !traderId ||
    traderId === myProfile?.profileId ||
    linkedAddressesMatch(traderAddress, myProfile?.linkedAccountAddress);
  const { traders: following } = useFollowedTraders();
  const ownerAddressOrId = useMyProfileAddress(myProfile);
  const addressOrId = isOwner ? ownerAddressOrId : (traderId ?? traderAddress);
  const liveProfile = useTraderProfile(addressOrId ?? '');
  const {
    refresh: refreshLiveProfile,
    isFollowing,
    toggleFollow,
  } = liveProfile;
  const { followWithSetup } = useFollowWithNotificationSetup({
    requireSocialTerms: true,
  });
  const { isChipMuted, showMuteChip, onMutePress } = useTraderMuteActions();
  const displayProfile = useMemo((): MySocialProfile | null => {
    if (isOwner) {
      return myProfile;
    }
    const remoteProfile = liveProfile.profile;
    if (remoteProfile) {
      return traderProfileResponseToMySocialProfile(remoteProfile, {
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
  const blockProfileId = isOwner
    ? undefined
    : liveProfile.profile?.profile.profileId;
  const { isBlocked, block, unblock } = useTraderBlock(blockProfileId);
  const trackInteraction = useSocialScreenAnalytics(Screen.MY_PROFILE, {
    state: [isLoading, Boolean(error), Boolean(displayProfile)],
    isActive: isOwner,
  });
  const muteProfileId = isOwner ? undefined : displayProfile?.profileId;
  const [activeTab, setActiveTab] = useState<ProfileContentTab>('open');
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
    isActive: activeTab === 'posts' && !isBlocked,
  });
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError: openPositionsError,
    closedError: closedPositionsError,
    refetch: refetchPositions,
  } = useTraderPositions(addressOrId ?? '', {
    refetchInterval: isBlocked ? undefined : 30_000,
  });
  const [assetFilter, setAssetFilter] = useState<ProfileAssetFilter>('all');
  const [isAssetFilterOpen, setIsAssetFilterOpen] = useState(false);
  const isAssetFilterActive = assetFilter !== 'all';
  const overlayedStats = useMemo(
    () =>
      displayProfile
        ? overlayMyProfileLiveStats(displayProfile, liveProfile.profile)
        : null,
    [displayProfile, liveProfile.profile],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false);
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

  const handleOpenProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(true);
  }, []);

  const handleCloseProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(false);
  }, []);

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

  const handleBlock = useCallback(async () => {
    const wasFollowing = isFollowing;
    const didBlock = await block();
    if (didBlock && wasFollowing) {
      await toggleFollow({
        source: 'trader_profile',
        traderAddress:
          traderAddress || liveProfile.profile?.profile.address || '',
        traderUsername: displayProfile?.displayName,
        traderAvatarUri: displayProfile?.imageUrl,
      });
    }
  }, [
    block,
    displayProfile,
    isFollowing,
    liveProfile.profile,
    toggleFollow,
    traderAddress,
  ]);

  const handleUnblock = useCallback(async () => {
    await unblock();
  }, [unblock]);

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
  const handleOpenAssetFilter = useCallback(() => {
    fireImpact(ImpactMoment.SecondaryCTA);
    setIsAssetFilterOpen(true);
  }, []);
  const handleCloseAssetFilter = useCallback(() => {
    setIsAssetFilterOpen(false);
  }, []);
  const visiblePosts = useMemo(
    () =>
      posts.filter((post) =>
        matchesProfileAssetFilter(post.position, assetFilter),
      ),
    [assetFilter, posts],
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

  // A Tokens or Perps filter only sees posts already loaded. Keep paging
  // until a match shows up, the feed ends, or the request fails.
  const showFilteredPostLoading =
    assetFilter !== 'all' &&
    visiblePosts.length === 0 &&
    !postsError &&
    (isPostsLoading || isFetchingNextPage || hasNextPage);
  const showInitialPostSkeletons =
    (isPostsLoading && posts.length === 0) || showFilteredPostLoading;
  const showPostsEmptyState =
    !isPostsLoading &&
    !isFetchingNextPage &&
    visiblePosts.length === 0 &&
    !postsError &&
    !showFilteredPostLoading;
  useEffect(() => {
    if (!showFilteredPostLoading || isPostsLoading || isFetchingNextPage) {
      return;
    }
    loadMore();
  }, [isFetchingNextPage, isPostsLoading, loadMore, showFilteredPostLoading]);
  const postsEmptyMessage =
    posts.length > 0 && assetFilter !== 'all'
      ? strings(filteredPostsEmptyKey(assetFilter))
      : undefined;
  const positionTab = profilePositionTab({
    activeTab,
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError: openPositionsError,
    closedError: closedPositionsError,
  });

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
        <HeaderStandardAnimatedGlass
          isFloating={false}
          backdrop="none"
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
            overlayedStats && !isBlocked ? (
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
          backButtonProps={{
            testID: MyProfileViewSelectorsIDs.BACK_BUTTON,
            hitSlop: HEADER_ICON_HIT_SLOP,
            twClassName: HEADER_ICON_BUTTON_CLASS,
          }}
          endAccessory={
            !isOwner && traderId ? (
              <SocialHeaderGlassSurface
                twClassName="gap-2 px-2"
                testID={MyProfileViewSelectorsIDs.HEADER_ACTIONS_CAPSULE}
              >
                <ButtonIcon
                  iconName={IconName.Share}
                  iconProps={{ color: IconColor.IconDefault }}
                  size={ButtonIconSize.Md}
                  onPress={handleShareTraderDeeplink}
                  accessibilityLabel={strings(
                    'social_leaderboard.my_profile.share_profile',
                  )}
                  testID={MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  twClassName={HEADER_ICON_BUTTON_CLASS}
                />
                <ButtonIcon
                  iconName={IconName.MoreHorizontal}
                  iconProps={{ color: IconColor.IconDefault }}
                  size={ButtonIconSize.Md}
                  onPress={handleOpenProfileOptions}
                  isDisabled={!blockProfileId}
                  accessibilityLabel={strings(
                    'social_leaderboard.trader_profile.more_options',
                  )}
                  testID={MyProfileViewSelectorsIDs.MORE_BUTTON}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  twClassName={HEADER_ICON_BUTTON_CLASS}
                />
              </SocialHeaderGlassSurface>
            ) : undefined
          }
          endButtonIconProps={
            isOwner && displayProfile
              ? [
                  {
                    iconName: IconName.Share,
                    iconProps: { color: IconColor.IconDefault },
                    size: ButtonIconSize.Md,
                    onPress: handleShareProfile,
                    accessibilityLabel: strings(
                      'social_leaderboard.my_profile.share_profile',
                    ),
                    testID: MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON,
                    hitSlop: HEADER_ICON_HIT_SLOP,
                    twClassName: HEADER_ICON_BUTTON_CLASS,
                  },
                ]
              : undefined
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
                      onPress={handleOpenComposer}
                      accessibilityLabel={strings(
                        'social_leaderboard.my_profile.create_post',
                      )}
                      testID={MyProfileViewSelectorsIDs.CREATE_POST_BUTTON}
                    >
                      {strings('social_leaderboard.my_profile.create_post')}
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
                    {isBlocked ? (
                      <Button
                        variant={ButtonVariant.Secondary}
                        isFullWidth
                        onPress={handleUnblock}
                        testID={MyProfileViewSelectorsIDs.UNBLOCK_BUTTON}
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
                        testID={MyProfileViewSelectorsIDs.FOLLOW_BUTTON}
                      >
                        {isFollowing
                          ? strings('social_leaderboard.following')
                          : strings('social_leaderboard.follow')}
                      </Button>
                    )}
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

            {isBlocked ? (
              <Box alignItems={BoxAlignItems.Center} twClassName="px-6 pt-12">
                <TabEmptyState
                  icon={
                    <>
                      <Icon
                        name={IconName.Ban}
                        size={IconSize.Lg}
                        color={IconColor.IconAlternative}
                      />
                      <Text
                        variant={TextVariant.HeadingSm}
                        twClassName="text-center"
                      >
                        {strings(
                          'social_leaderboard.trader_profile.blocked_title',
                          { name: displayProfile.displayName },
                        )}
                      </Text>
                    </>
                  }
                  description={strings(
                    'social_leaderboard.trader_profile.blocked_description',
                  )}
                  twClassName="max-w-80"
                  testID={MyProfileViewSelectorsIDs.BLOCKED_STATE}
                />
              </Box>
            ) : (
              <>
                <MyProfilePerformanceStats
                  cells={overlayedStats.performanceCells}
                />

                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="bg-default mt-5 pr-4"
                >
                  <Box twClassName="min-w-0 flex-1">
                    <TabsBar
                      tabs={profileTabs}
                      activeIndex={PROFILE_CONTENT_TABS.indexOf(activeTab)}
                      onTabPress={handleProfileTabPress}
                    />
                  </Box>
                  <ButtonIcon
                    iconName={IconName.Filter}
                    iconProps={{
                      size: IconSize.Lg,
                      color: IconColor.IconDefault,
                    }}
                    size={ButtonIconSize.Md}
                    onPress={handleOpenAssetFilter}
                    accessibilityLabel={strings(
                      'social_leaderboard.shell.filters.title',
                    )}
                    accessibilityState={{ selected: isAssetFilterActive }}
                    testID={MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON}
                    twClassName={isAssetFilterActive ? 'bg-pressed' : undefined}
                  />
                </Box>

                {activeTab !== 'posts' ? (
                  <ProfilePositionsTab
                    positions={positionTab.positions}
                    isLoading={positionTab.isLoading}
                    error={positionTab.error}
                    isClosed={positionTab.isClosed}
                    filter={assetFilter}
                    onPositionPress={handlePositionPress}
                    onRetry={handlePositionsRetry}
                    showFlaggedState={!isOwner}
                  />
                ) : (
                  <ProfilePostsContent
                    showInitialPostSkeletons={showInitialPostSkeletons}
                    showPostsEmptyState={showPostsEmptyState}
                    postsEmptyMessage={postsEmptyMessage}
                    postsError={postsError}
                    visiblePosts={visiblePosts}
                    onRetry={refreshPosts}
                    showCopyTrade={!isOwner}
                  />
                )}
                {activeTab === 'posts' &&
                isFetchingNextPage &&
                visiblePosts.length > 0 ? (
                  <Box
                    alignItems={BoxAlignItems.Center}
                    twClassName="px-4"
                    testID={MyProfileViewSelectorsIDs.POSTS_FOOTER_LOADING}
                  >
                    <ActivityIndicator size="small" />
                  </Box>
                ) : null}
              </>
            )}
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
        {isAssetFilterOpen ? (
          <ProfileAssetFilterSheet
            value={assetFilter}
            onApply={handleAssetFilterChange}
            onClose={handleCloseAssetFilter}
          />
        ) : null}
        {isProfileOptionsOpen && displayProfile && blockProfileId ? (
          <ProfileOptionsSheet
            traderName={displayProfile.displayName}
            onBlock={handleBlock}
            onClose={handleCloseProfileOptions}
          />
        ) : null}
      </SafeAreaView>
    </SocialFeedSurfaceProvider>
  );
};

export default MyProfileView;
