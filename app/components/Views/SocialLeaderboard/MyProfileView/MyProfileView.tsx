import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  SectionDivider,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Share,
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
import { useTraderProfile } from '../TraderProfileView/hooks';
import SocialFeedPostShell from '../SocialV1View/feed/components/SocialFeedPostShell';
import SocialFeedPostSkeleton from '../SocialV1View/feed/components/SocialFeedPostSkeleton';
import SocialV1FeedPostList from '../SocialV1View/feed/components/SocialV1FeedPostList';
import { getSocialV1FeedEntryDividerTestId } from '../SocialV1View/feed/components/SocialV1FeedPostList.testIds';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import MyProfileHeader from './components/MyProfileHeader';
import ProfilePostsEmptyState from './components/ProfilePostsEmptyState';
import ProfileAvatar from './components/ProfileAvatar';
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

const END_REACHED_THRESHOLD_PX = 600;
const REFRESH_MIN_DURATION_MS = 1000;
const INITIAL_POST_SKELETON_COUNT = 4;
const INITIAL_POST_SKELETON_KEYS = Array.from(
  { length: INITIAL_POST_SKELETON_COUNT },
  (_, index) => `my-profile-post-skeleton-${index}`,
);

const MyProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { profile, isLoading, error, refresh } = useMyProfile();
  const { traders: following } = useFollowedTraders();
  const addressOrId = useMyProfileAddress(profile);
  const liveProfile = useTraderProfile(addressOrId ?? '');
  const { refresh: refreshLiveProfile } = liveProfile;
  const {
    posts,
    isLoading: isPostsLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error: postsError,
    refresh: refreshPosts,
  } = useMyProfilePosts(addressOrId);
  const openPositionsCount = useMyOpenPerpsPositionCount();
  const overlayedStats = useMemo(
    () =>
      profile ? overlayMyProfileLiveStats(profile, liveProfile.profile) : null,
    [liveProfile.profile, profile],
  );
  const [isStatsSheetOpen, setIsStatsSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE);
  }, [navigation]);
  const handleFollowersPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'followers',
    });
  }, [navigation]);
  const handleFollowingPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'following',
    });
  }, [navigation]);
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
    if (!profile) {
      return;
    }

    const message = strings(
      'social_leaderboard.my_profile.share_profile_message',
      {
        displayName: profile.displayName,
        profileUrl: profile.shareUrl,
      },
    );
    Share.share({ message }).catch(() => undefined);
  }, [profile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, REFRESH_MIN_DURATION_MS),
      );
      await Promise.all([
        refresh(),
        refreshLiveProfile(),
        refreshPosts(),
        minDuration,
      ]);
    } catch {
      // Errors stay on the respective query surfaces.
    } finally {
      setRefreshing(false);
    }
  }, [refreshLiveProfile, refreshPosts, refresh]);

  const handleScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasNextPage) {
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
    [hasNextPage, loadMore],
  );

  const showInitialPostSkeletons = isPostsLoading && posts.length === 0;
  const showPostsEmptyState =
    !isPostsLoading && posts.length === 0 && !postsError;

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={MyProfileViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title=""
        onBack={handleBack}
        backButtonProps={{ testID: MyProfileViewSelectorsIDs.BACK_BUTTON }}
        testID={MyProfileViewSelectorsIDs.HEADER}
      />

      {isLoading && !profile ? (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={MyProfileViewSelectorsIDs.LOADING}
        >
          <Spinner />
        </Box>
      ) : error && !profile ? (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={MyProfileViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
      ) : profile && overlayedStats ? (
        <Animated.ScrollView
          testID={MyProfileViewSelectorsIDs.SCROLL}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('flex-grow pb-6')}
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
          <MyProfileHeader
            profile={profile}
            overlayedStats={overlayedStats}
            followingCount={following.length}
            onFollowersPress={handleFollowersPress}
            onFollowingPress={handleFollowingPress}
            onStatsPress={() => setIsStatsSheetOpen(true)}
          />

          <Box
            flexDirection={BoxFlexDirection.Row}
            gap={2}
            paddingHorizontal={4}
            paddingBottom={8}
          >
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
          </Box>

          <Box twClassName="border-b border-muted">
            <Box
              twClassName="self-start border-b-2 border-default"
              paddingHorizontal={4}
              paddingBottom={3}
              testID={MyProfileViewSelectorsIDs.POSTS_TAB}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {strings('social_leaderboard.my_profile.posts')}
              </Text>
            </Box>
          </Box>

          {showInitialPostSkeletons ? (
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
          {isFetchingNextPage ? (
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
      {isStatsSheetOpen && profile && overlayedStats ? (
        <TraderStatsSheet
          profile={overlayedStats.sheetProfile}
          profileHandle={profile.handle}
          fallbackFields={overlayedStats.fallbackFields}
          hideHoldTime
          openPositionsCount={openPositionsCount}
          profileAgeLabel={overlayedStats.profileAgeLabel}
          copySuccessRateLabel={overlayedStats.copySuccessRateLabel}
          headerAvatar={
            <ProfileAvatar
              imageUrl={profile.imageUrl}
              avatarPresetId={profile.avatarPresetId}
              size="sm"
              testID={TraderStatsSheetSelectorsIDs.HEADER_AVATAR}
            />
          }
          onClose={() => setIsStatsSheetOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default MyProfileView;
