import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandardAnimated,
  SectionDivider,
  Spinner,
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
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Share,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { useTheme } from '../../../../util/theme';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { useFollowedTraders } from '../NotificationPreferences/hooks';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import {
  useTraderPositions,
  useTraderProfile,
} from '../TraderProfileView/hooks';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedPostSkeleton from '../../../UI/SocialFeed/components/SocialFeedPostSkeleton';
import SocialV1FeedPostList from '../../../UI/SocialFeed/components/SocialV1FeedPostList';
import { getSocialV1FeedEntryDividerTestId } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import MyProfileHeader from './components/MyProfileHeader';
import MyProfileCompactStats from './components/MyProfileCompactStats';
import ProfilePostsEmptyState from './components/ProfilePostsEmptyState';
import ProfilePositionsTab from './components/ProfilePositionsTab';
import ProfileAvatar from './components/ProfileAvatar';

import TraderAvatar from '../../../UI/SocialFeed/components/TraderAvatar';
import TraderHeaderIdentity from '../components/TraderHeaderIdentity';

import {
  useMyOpenPerpsPositionCount,
  useMyProfile,
  useMyProfileAddress,
  useMyProfilePosts,
} from './hooks';
import { resetLocalSocialProfile } from './hooks/localSocialProfileStore';
import TraderStatsSheet from '../TraderProfileView/components/TraderStatsSheet';
import { TraderStatsSheetSelectorsIDs } from '../TraderProfileView/components/TraderStatsSheet.testIds';
import { overlayMyProfileLiveStats } from './utils/overlayMyProfileLiveStats';
import { traderProfileResponseToMySocialProfile } from './utils/traderProfileResponseToMySocialProfile';
import type { MySocialProfile } from './hooks/useMyProfile';
import type { ProfileAssetFilter } from './utils/splitPositionsByType';

type ProfileContentTab = 'open' | 'closed' | 'posts';

interface ProfileTabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID: string;
}

const ProfileTabButton: React.FC<ProfileTabButtonProps> = ({
  label,
  isActive,
  onPress,
  testID,
}) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="tab"
    accessibilityState={{ selected: isActive }}
  >
    <Box
      twClassName={isActive ? 'border-b-2 border-default' : ''}
      paddingBottom={3}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={isActive ? FontWeight.Bold : FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </Pressable>
);

const END_REACHED_THRESHOLD_PX = 600;
const REFRESH_MIN_DURATION_MS = 1000;
const INITIAL_POST_SKELETON_COUNT = 4;
const INITIAL_POST_SKELETON_KEYS = Array.from(
  { length: INITIAL_POST_SKELETON_COUNT },
  (_, index) => `my-profile-post-skeleton-${index}`,
);

const MyProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
      shareUrl: '',
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
  const {
    posts,
    isLoading: isPostsLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error: postsError,
    refresh: refreshPosts,
  } = useMyProfilePosts(addressOrId);
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError: openPositionsError,
    closedError: closedPositionsError,
    refetch: refetchPositions,
  } = useTraderPositions(addressOrId ?? '');
  const openPositionsCount = useMyOpenPerpsPositionCount();
  const [activeTab, setActiveTab] = useState<ProfileContentTab>('posts');
  const [assetFilter, setAssetFilter] = useState<ProfileAssetFilter>('all');
  const overlayedStats = useMemo(
    () =>
      displayProfile
        ? overlayMyProfileLiveStats(displayProfile, liveProfile.profile)
        : null,
    [displayProfile, liveProfile.profile],
  );
  const [isStatsSheetOpen, setIsStatsSheetOpen] = useState(false);
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
  const handleFollowersPress = useCallback(() => {
    if (!isOwner) {
      return;
    }
    navigation.navigate(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'followers',
    });
  }, [isOwner, navigation]);
  const handleFollowingPress = useCallback(() => {
    if (!isOwner) {
      return;
    }
    navigation.navigate(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'following',
    });
  }, [isOwner, navigation]);
  const handleShareFirstTrade = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.POST_COMPOSER);
  }, [navigation]);

  const handleResetProfile = useCallback(() => {
    resetLocalSocialProfile();
    navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }, [navigation]);

  const handleCreateProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }, [navigation]);

  const handleShareProfile = useCallback(() => {
    if (!displayProfile?.shareUrl) {
      return;
    }

    const message = strings(
      'social_leaderboard.my_profile.share_profile_message',
      {
        displayName: displayProfile.displayName,
        profileUrl: displayProfile.shareUrl,
      },
    );
    Share.share({ message }).catch(() => undefined);
  }, [displayProfile]);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
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
  }, [refreshLiveProfile, refreshPosts, refresh, refetchPositions]);

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
    [activeTab, displayProfile, navigation, traderAddress],
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
    <SocialFeedSurfaceProvider location="my_profile" showMockedFields>
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
                followingCount={following.length}
                isOwner={isOwner}
                onFollowersPress={handleFollowersPress}
                onFollowingPress={handleFollowingPress}
                onStatsPress={() => setIsStatsSheetOpen(true)}
              />
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              gap={2}
              paddingHorizontal={4}
              paddingBottom={8}
            >
              {isOwner ? (
                <>
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
                </>
              ) : (
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
              )}
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="border-b border-muted px-4 gap-4"
              accessibilityRole="tablist"
            >
              <ProfileTabButton
                label={strings('social_leaderboard.trader_profile.open')}
                isActive={activeTab === 'open'}
                onPress={() => setActiveTab('open')}
                testID={MyProfileViewSelectorsIDs.OPEN_TAB}
              />
              <ProfileTabButton
                label={strings('social_leaderboard.trader_profile.closed')}
                isActive={activeTab === 'closed'}
                onPress={() => setActiveTab('closed')}
                testID={MyProfileViewSelectorsIDs.CLOSED_TAB}
              />
              <ProfileTabButton
                label={strings('social_leaderboard.my_profile.posts')}
                isActive={activeTab === 'posts'}
                onPress={() => setActiveTab('posts')}
                testID={MyProfileViewSelectorsIDs.POSTS_TAB}
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
                onFilterChange={setAssetFilter}
                onPositionPress={handlePositionPress}
                onRetry={handlePositionsRetry}
              />
            ) : showInitialPostSkeletons ? (
              <Box paddingTop={4}>
                {INITIAL_POST_SKELETON_KEYS.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? (
                      <SectionDivider
                        marginVertical={1}
                        testID={getSocialV1FeedEntryDividerTestId(
                          `loading-${index}`,
                        )}
                      />
                    ) : null}
                    <Box twClassName="px-4">
                      <SocialFeedPostSkeleton index={index} />
                    </Box>
                  </Fragment>
                ))}
              </Box>
            ) : showPostsEmptyState ? (
              <ProfilePostsEmptyState
                isOwner={isOwner}
                onShareFirstTrade={handleShareFirstTrade}
                onResetProfile={handleResetProfile}
              />
            ) : postsError && posts.length === 0 ? (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="w-full px-4 py-16 gap-3"
                testID={MyProfileViewSelectorsIDs.POSTS_ERROR}
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
                  onPress={refreshPosts}
                  twClassName="self-center"
                  testID={MyProfileViewSelectorsIDs.POSTS_RETRY_BUTTON}
                >
                  {strings('social_leaderboard.feed.error.retry')}
                </Button>
              </Box>
            ) : (
              <Box testID={MyProfileViewSelectorsIDs.POSTS_LIST}>
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
        {isStatsSheetOpen && displayProfile && overlayedStats ? (
          <TraderStatsSheet
            profile={overlayedStats.sheetProfile}
            profileHandle={displayProfile.handle}
            fallbackFields={overlayedStats.fallbackFields}
            includeHoldTime={false}
            openPositionsCount={openPositionsCount}
            profileAgeLabel={overlayedStats.profileAgeLabel}
            copySuccessRateLabel={overlayedStats.copySuccessRateLabel}
            headerAvatar={
              isOwner ? (
                <ProfileAvatar
                  imageUrl={displayProfile.imageUrl}
                  avatarPresetId={displayProfile.avatarPresetId}
                  size="sm"
                  testID={TraderStatsSheetSelectorsIDs.HEADER_AVATAR}
                />
              ) : (
                <TraderAvatar
                  imageUrl={displayProfile.imageUrl}
                  address={displayProfile.linkedAccountAddress ?? undefined}
                  size={40}
                  recyclingKey={displayProfile.profileId}
                  testID={TraderStatsSheetSelectorsIDs.HEADER_AVATAR}
                />
              )
            }
            onClose={() => setIsStatsSheetOpen(false)}
          />
        ) : null}
      </SafeAreaView>
    </SocialFeedSurfaceProvider>
  );
};

export default MyProfileView;
