import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
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
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RefreshControl, type LayoutChangeEvent } from 'react-native';
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
import { buildSocialProfileOgImageRequest } from '../navigation/socialOgImageCards';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  toFoxiconAvatarUrl,
} from './avatarPresets';
import {
  buildSocialProfileOpenGraph,
  readTraderShareName,
} from '../navigation/socialShareOpenGraph';
import { shareSocialProfile } from '../navigation/socialTraderDeeplink';
import { useSocialShareInProgress } from '../navigation/useSocialShareInProgress';
import ShareButtonSpinner from '../components/ShareButtonSpinner';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import TraderMuteChip, {
  PROFILE_MUTE_CHIP_DIAMETER,
} from '../components/TraderMuteChip';
import { useFollowedTraders } from '../NotificationPreferences/hooks';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import { useOpenSocialPostComposer } from '../hooks/useOpenSocialPostComposer';
import { useSpotCopyTradeQuickBuy } from '../hooks/useSpotCopyTradeQuickBuy';
import { PostTradeShareOwner } from '../PostTradeShareBottomSheet';
import { useTraderMuteActions } from '../hooks/useTraderMuteActions';
import {
  useTraderBlock,
  useTraderPositions,
  useTraderProfile,
} from '../TraderProfileView/hooks';
import ProfileOptionsSheet from '../TraderProfileView/components/ProfileOptionsSheet';
import SocialFeed, {
  type SocialFeedRefreshHandle,
} from '../../../UI/SocialFeed/components/SocialFeed';
import SocialFeedError from '../../../UI/SocialFeed/components/SocialFeedError';
import type {
  SocialV1FeedAuthor,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import ProfilePostsLoadingState from '../shared/ProfilePostsLoadingState';
import { isPerpPosition } from '../../../UI/SocialFeed/utils/perp';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import MyProfileHeader from './components/MyProfileHeader';
import MyProfileCompactStats from './components/MyProfileCompactStats';
import MyProfilePerformanceStats from './components/MyProfilePerformanceStats';
import ProfilePostsEmptyState from './components/ProfilePostsEmptyState';
import ProfilePositionsTab from './components/ProfilePositionsTab';
import UncountedPositionsSheet from './components/UncountedPositionsSheet';
import ProfileAvatar from './components/ProfileAvatar';

import TraderHeaderIdentity from '../components/TraderHeaderIdentity';

import { useMyProfile, useMyProfileAddress } from './hooks';
import { overlayMyProfileLiveStats } from './utils/overlayMyProfileLiveStats';
import { traderProfileResponseToMySocialProfile } from './utils/traderProfileResponseToMySocialProfile';
import type { MySocialProfile } from './hooks/useMyProfile';
import ProfileAssetFilterSheet from './components/ProfileAssetFilterSheet';
import {
  matchesProfileAssetFilter,
  type ProfileAssetFilter,
} from './utils/splitPositionsByType';
import {
  SocialEvent,
  useSocialAnalytics,
  useSocialScreenAnalytics,
} from '../analytics';

/** Same 12px slop the home header uses so each icon stays a comfortable tap. */
const HEADER_ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/** Icons sit on glass capsules; the default press fill would cover the material. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const { Filter, Interaction, Screen, ShareDestination, Trade } = SocialEvent;
const PROFILE_CONTENT_TABS = ['posts', 'open', 'closed'] as const;
type ProfileContentTab = (typeof PROFILE_CONTENT_TABS)[number];

const REFRESH_MIN_DURATION_MS = 1000;
const NO_POSITIONS: Position[] = [];

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

/** Sheet identity for a profile row. Missing stats stay empty so badges hide. */
const positionSheetAuthor = (
  profile: MySocialProfile,
  traderAddress: string | undefined,
): SocialV1FeedAuthor => ({
  id: profile.profileId,
  username: profile.displayName,
  address: profile.linkedAccountAddress ?? traderAddress,
  avatarUri: profile.imageUrl,
  winRatePercent: profile.winRatePercent ?? null,
  pnl30d: profile.pnlUsd ?? null,
  followerCount: profile.followerCount ?? null,
  xHandle: profile.xHandle ?? null,
});

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
    requireSocialProfile: true,
  });
  const { isChipMuted, showMuteChip, onMutePress } = useTraderMuteActions();
  const isFocused = useIsFocused();
  const { onCopyTrade: handleSpotCopyTrade, quickBuySheet } =
    useSpotCopyTradeQuickBuy({
      source: SocialEvent.Source.TRADER_FEED,
      postTradeShareOwner: PostTradeShareOwner.socialV1Profile,
      isActive: isFocused && !isOwner,
    });
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
  const isPrivate = displayProfile?.shareTradingActivity === false;
  // Another trader's privacy is unknown until Social API answers, so nothing
  // they may keep private is fetched or followable before then.
  const isPrivacyPending = !isOwner && !liveProfile.profile;
  const privacyLoadError = isPrivacyPending ? liveProfile.error : null;
  const isContentHidden = isBlocked || isPrivate || isPrivacyPending;
  const { trackInteraction: trackSocialPost } = useSocialAnalytics();
  const trackInteraction = useSocialScreenAnalytics(Screen.MY_PROFILE, {
    state: [isLoading, Boolean(error), Boolean(displayProfile)],
    isActive: isOwner,
  });
  const muteProfileId = isOwner ? undefined : displayProfile?.profileId;
  const [activeTab, setActiveTab] = useState<ProfileContentTab>('posts');
  const profileTabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'posts',
        label: strings('social_leaderboard.my_profile.posts'),
        content: null,
        testID: MyProfileViewSelectorsIDs.POSTS_TAB,
      },
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
    ],
    [],
  );
  const handleProfileTabPress = useCallback(
    (index: number) => {
      const nextTab = PROFILE_CONTENT_TABS[index];
      if (!nextTab || nextTab === activeTab) {
        return;
      }
      playSelection().catch(() => undefined);
      setActiveTab(nextTab);
    },
    [activeTab],
  );
  const scrollRef = useRef<Animated.ScrollView>(null);
  const postsFeedRef = useRef<SocialFeedRefreshHandle>(null);
  const {
    openPositions: fetchedOpenPositions,
    closedPositions: fetchedClosedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError: openPositionsError,
    closedError: closedPositionsError,
    refetch: refetchPositions,
  } = useTraderPositions(addressOrId ?? '', {
    enabled: !isContentHidden,
    refetchInterval: 30_000,
  });
  // Disabled queries still return cached data, e.g. from an earlier visit.
  const openPositions = isContentHidden ? NO_POSITIONS : fetchedOpenPositions;
  const closedPositions = isContentHidden
    ? NO_POSITIONS
    : fetchedClosedPositions;
  const [assetFilter, setAssetFilter] = useState<ProfileAssetFilter>('all');
  const [isAssetFilterOpen, setIsAssetFilterOpen] = useState(false);
  const isAssetFilterActive = assetFilter !== 'all';
  const overlayedStats = useMemo(
    () =>
      displayProfile
        ? overlayMyProfileLiveStats(
            displayProfile,
            liveProfile.profile,
            openPositions,
          )
        : null,
    [displayProfile, liveProfile.profile, openPositions],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false);
  const [isUncountedSheetOpen, setIsUncountedSheetOpen] = useState(false);
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
    playSelection().catch(() => undefined);
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE);
  }, [navigation]);
  const handleOpenPrivacySettings = useCallback(() => {
    playSelection().catch(() => undefined);
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY);
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

  const buildProfileOgImageRequest = useCallback(
    (shareTraderId: string, username: string | undefined) => async () =>
      buildSocialProfileOgImageRequest({
        traderId: shareTraderId,
        username: liveProfile.profile?.profile.name || username,
        avatarUrl:
          liveProfile.profile?.profile.imageUrl ||
          displayProfile?.imageUrl ||
          (displayProfile?.avatarPresetId
            ? toFoxiconAvatarUrl(
                displayProfile.avatarPresetId,
                displayProfile.avatarBackgroundId ??
                  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
              )
            : undefined),
        profile: liveProfile.profile,
        closedPositions,
        nowMs: Date.now(),
      }),
    [
      closedPositions,
      displayProfile?.avatarBackgroundId,
      displayProfile?.avatarPresetId,
      displayProfile?.imageUrl,
      liveProfile.profile,
    ],
  );
  const trackProfileShared = useCallback(() => {
    trackSocialPost({
      interaction_type: Interaction.POST_SHARED,
      screen_name: Screen.MY_PROFILE,
      share_destination: ShareDestination.EXTERNAL,
    });
  }, [trackSocialPost]);
  const { isSharing, runShare } = useSocialShareInProgress();
  const handleShareTraderDeeplink = useCallback(() => {
    if (!traderId) {
      return;
    }
    playSelection().catch(() => undefined);
    runShare(() =>
      shareSocialProfile(
        traderId,
        trackProfileShared,
        buildSocialProfileOpenGraph(
          readTraderShareName(
            liveProfile.profile?.profile,
            displayProfile?.displayName,
          ),
        ),
        buildProfileOgImageRequest(traderId, displayProfile?.handle),
      ),
    );
  }, [
    buildProfileOgImageRequest,
    displayProfile?.displayName,
    displayProfile?.handle,
    liveProfile.profile?.profile,
    runShare,
    trackProfileShared,
    traderId,
  ]);

  const handleOpenProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(true);
  }, []);

  const handleCloseProfileOptions = useCallback(() => {
    setIsProfileOptionsOpen(false);
  }, []);
  const handleOpenUncountedSheet = useCallback(() => {
    setIsUncountedSheetOpen(true);
  }, []);
  const handleCloseUncountedSheet = useCallback(() => {
    setIsUncountedSheetOpen(false);
  }, []);

  const handleShareProfile = useCallback(() => {
    const profileId = myProfile?.profileId;
    if (!profileId) {
      return;
    }
    playSelection().catch(() => undefined);
    const displayName = myProfile?.displayName;
    const handle = myProfile?.handle;
    runShare(() =>
      shareSocialProfile(
        profileId,
        trackProfileShared,
        buildSocialProfileOpenGraph(displayName),
        buildProfileOgImageRequest(profileId, handle),
      ),
    );
  }, [
    buildProfileOgImageRequest,
    myProfile?.displayName,
    myProfile?.handle,
    myProfile?.profileId,
    runShare,
    trackProfileShared,
  ]);

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
      const postsRefresh = postsFeedRef.current?.refresh();
      // refreshLiveProfile rethrows after logging; allSettled keeps one
      // failure from aborting the others and from becoming unhandled.
      // refetch() ignores `enabled`, so hidden content must not be refetched.
      await Promise.allSettled([
        refresh(),
        refreshLiveProfile(),
        ...(isContentHidden ? [] : [refetchPositions()]),
        ...(postsRefresh ? [postsRefresh] : []),
        minDuration,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    isContentHidden,
    refresh,
    refreshLiveProfile,
    refetchPositions,
    trackInteraction,
  ]);

  const handlePositionsRetry = useCallback(() => {
    (privacyLoadError ? refreshLiveProfile() : refetchPositions()).catch(
      () => undefined,
    );
  }, [privacyLoadError, refetchPositions, refreshLiveProfile]);
  const handlePrivacyRetry = useCallback(() => {
    refreshLiveProfile().catch(() => undefined);
  }, [refreshLiveProfile]);

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
      const isClosed = activeTab === 'closed';
      // Profile rows use the feed sheet. A row with no id stays on the
      // position screen, which can still render the snapshot.
      if (position.positionId) {
        navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
          positionId: position.positionId,
          position,
          author: positionSheetAuthor(displayProfile, traderAddress),
          isClosed,
        });
        return;
      }
      navigation.navigate(Routes.SOCIAL.POSITION, {
        traderId: displayProfile.profileId,
        traderName: displayProfile.displayName,
        traderImageUrl: displayProfile.imageUrl ?? undefined,
        traderAddress:
          displayProfile.linkedAccountAddress ?? traderAddress ?? undefined,
        tokenSymbol: position.tokenSymbol,
        position,
        source: 'profile_position',
        isClosed,
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
  const isAwaitingPrivacy = isPrivacyPending && !privacyLoadError;
  const filterProfilePost = useCallback(
    (post: SocialV1FeedPost) =>
      post.item.author.id === displayProfile?.profileId &&
      Boolean(post.commentId) &&
      matchesProfileAssetFilter(post.position, assetFilter),
    [assetFilter, displayProfile?.profileId],
  );
  const postsEmptyMessage =
    assetFilter !== 'all'
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
                traderProfileId={displayProfile.profileId}
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
            overlayedStats && !isContentHidden ? (
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
                {isSharing ? (
                  <ShareButtonSpinner
                    testID={MyProfileViewSelectorsIDs.SHARE_SPINNER}
                  />
                ) : (
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
                )}
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
            ) : isOwner && displayProfile && isSharing ? (
              // Takes the place of the share capsule below while it works.
              <ShareButtonSpinner
                isCapsule
                testID={MyProfileViewSelectorsIDs.SHARE_SPINNER}
              />
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
                isPrivate
                  ? 3
                  : overlayedStats.performanceCells.length === 0
                    ? 8
                    : undefined
              }
            >
              {isOwner ? (
                <Box flexDirection={BoxFlexDirection.Row} gap={2}>
                  {isPrivate ? null : (
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
                  )}
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
              ) : isPrivate && !isBlocked && !isFollowing ? null : (
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
                        isDisabled={isPrivacyPending}
                        onPress={handleFollowPress}
                        testID={MyProfileViewSelectorsIDs.FOLLOW_BUTTON}
                      >
                        {isFollowing
                          ? strings('social_leaderboard.following')
                          : strings('social_leaderboard.follow')}
                      </Button>
                    )}
                  </Box>
                  {showMuteChip && muteProfileId && !isPrivate ? (
                    <TraderMuteChip
                      isMuted={isChipMuted(muteProfileId)}
                      visible={isFollowing}
                      onPress={handleMutePress}
                      traderName={displayProfile?.displayName}
                      diameter={PROFILE_MUTE_CHIP_DIAMETER}
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
                          { name: displayProfile.handle },
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
            ) : isPrivate ? (
              <>
                <SectionDivider marginVertical={4} />
                <Box alignItems={BoxAlignItems.Center} twClassName="px-8 py-12">
                  <TabEmptyState
                    icon={
                      <Box
                        alignItems={BoxAlignItems.Center}
                        gap={4}
                        twClassName="w-full"
                      >
                        <Box
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          <Icon
                            name={IconName.EyeSlash}
                            size={IconSize.Xl}
                            color={IconColor.IconDefault}
                          />
                        </Box>
                        <Box gap={1} twClassName="w-full">
                          <Text
                            variant={TextVariant.HeadingSm}
                            twClassName="text-center"
                          >
                            {strings(
                              isOwner
                                ? 'social_leaderboard.trader_profile.private_title_own'
                                : 'social_leaderboard.trader_profile.private_title',
                            )}
                          </Text>
                          <Text
                            variant={TextVariant.BodyMd}
                            color={TextColor.TextAlternative}
                            numberOfLines={3}
                            ellipsizeMode="tail"
                            twClassName="text-center"
                          >
                            {isOwner
                              ? strings(
                                  'social_leaderboard.trader_profile.private_description_own',
                                )
                              : strings(
                                  'social_leaderboard.trader_profile.private_description',
                                  { name: displayProfile.handle },
                                )}
                          </Text>
                        </Box>
                      </Box>
                    }
                    actionButtonText={
                      isOwner
                        ? strings(
                            'social_leaderboard.trader_profile.privacy_settings',
                          )
                        : undefined
                    }
                    onAction={isOwner ? handleOpenPrivacySettings : undefined}
                    actionButtonProps={{
                      twClassName: 'self-center rounded-xl',
                      testID: MyProfileViewSelectorsIDs.PRIVACY_SETTINGS_BUTTON,
                    }}
                    twClassName="w-full max-w-none"
                    testID={MyProfileViewSelectorsIDs.PRIVATE_STATE}
                  />
                </Box>
              </>
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
                    isLoading={positionTab.isLoading || isAwaitingPrivacy}
                    error={privacyLoadError ?? positionTab.error}
                    isClosed={positionTab.isClosed}
                    filter={assetFilter}
                    onPositionPress={handlePositionPress}
                    onRetry={handlePositionsRetry}
                    showFlaggedState={!isOwner}
                    onUncountedHeaderPress={handleOpenUncountedSheet}
                  />
                ) : isAwaitingPrivacy ? (
                  <ProfilePostsLoadingState />
                ) : privacyLoadError ? (
                  <SocialFeedError onRetry={handlePrivacyRetry} />
                ) : (
                  <Box paddingTop={4}>
                    <SocialFeed
                      scope="all"
                      profileId={displayProfile.profileId}
                      commentedOnly
                      location="my_profile"
                      analyticsEnabled={isOwner}
                      realtime
                      refreshRef={postsFeedRef}
                      filterPost={filterProfilePost}
                      onCopyTrade={handleSpotCopyTrade}
                      emptyState={
                        <ProfilePostsEmptyState message={postsEmptyMessage} />
                      }
                      testID={MyProfileViewSelectorsIDs.POSTS_LIST}
                    />
                  </Box>
                )}
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
            traderName={displayProfile.handle}
            onBlock={handleBlock}
            onClose={handleCloseProfileOptions}
          />
        ) : null}
        {isUncountedSheetOpen ? (
          <UncountedPositionsSheet
            isOwner={isOwner}
            onClose={handleCloseUncountedSheet}
          />
        ) : null}
        {quickBuySheet}
      </SafeAreaView>
    </SocialFeedSurfaceProvider>
  );
};

export default MyProfileView;
