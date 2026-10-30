import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { Linking, Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import EditableProfileAvatar from './EditableProfileAvatar';

import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';

import type { MySocialProfile } from '../hooks/useMyProfile';
import { formatJoinedLabel } from '../utils/formatJoinedLabel';
import type { OverlayedMyProfileStats } from '../utils/overlayMyProfileLiveStats';

interface MyProfileHeaderProps {
  profile: MySocialProfile;
  overlayedStats: OverlayedMyProfileStats;
  followingCount: number;
  isOwner?: boolean;
  onEditAvatar?: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

/** A muted icon and label in the row under the follower counts. */
const ProfileMetaItem: React.FC<{
  iconName: IconName;
  label: string;
  testID?: string;
}> = ({ iconName, label, testID }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={1}
    testID={testID}
  >
    <Icon
      name={iconName}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
    />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {label}
    </Text>
  </Box>
);

const MyProfileHeader: React.FC<MyProfileHeaderProps> = ({
  profile,
  overlayedStats,
  followingCount,
  isOwner = true,
  onEditAvatar,
  onFollowersPress,
  onFollowingPress,
}) => {
  const handleXPress = useCallback(() => {
    if (profile.xHandle) {
      Linking.openURL(`https://x.com/${profile.xHandle}`).catch(
        (error: Error) => {
          Logger.error(error, 'MyProfileHeader: failed to open the X profile');
        },
      );
    }
  }, [profile.xHandle]);

  const joinedLabel = formatJoinedLabel(profile.joinedAt);
  const thesis = profile.bio?.trim() || '';

  return (
    <Box paddingHorizontal={4} paddingTop={3} paddingBottom={4}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        {isOwner && onEditAvatar ? (
          <EditableProfileAvatar
            imageUrl={profile.imageUrl}
            avatarPresetId={profile.avatarPresetId}
            avatarBackgroundId={profile.avatarBackgroundId}
            diameter={56}
            onPress={onEditAvatar}
            avatarTestID={MyProfileViewSelectorsIDs.AVATAR}
            showEditIcon={false}
            accessibilityLabel={strings(
              'social_leaderboard.my_profile.avatar_accessibility_label',
            )}
          />
        ) : (
          <TraderAvatar
            imageUrl={profile.imageUrl}
            address={profile.linkedAccountAddress ?? undefined}
            size={56}
            recyclingKey={profile.profileId}
            testID={MyProfileViewSelectorsIDs.AVATAR}
          />
        )}

        <Box twClassName="flex-1 min-w-0" gap={1}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
              twClassName="flex-shrink"
              testID={MyProfileViewSelectorsIDs.DISPLAY_NAME}
            >
              {profile.displayName}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            twClassName="-mt-2"
            testID={MyProfileViewSelectorsIDs.HANDLE}
          >
            @{profile.handle}
          </Text>
        </Box>
      </Box>

      {thesis ? (
        <Box twClassName="pt-[14px] pb-[10px]">
          <Text
            variant={TextVariant.BodyMd}
            testID={MyProfileViewSelectorsIDs.BIO}
          >
            {thesis}
          </Text>
        </Box>
      ) : null}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        paddingTop={thesis ? 0 : 4}
      >
        <Pressable
          onPress={onFollowersPress}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'social_leaderboard.my_profile.followers_tab',
            { count: overlayedStats.followerCount },
          )}
          testID={MyProfileViewSelectorsIDs.FOLLOWERS_BUTTON}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={MyProfileViewSelectorsIDs.FOLLOWERS_COUNT}
            >
              {overlayedStats.followerCount}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.my_profile.followers')}
            </Text>
          </Box>
        </Pressable>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          ·
        </Text>
        <Pressable
          onPress={onFollowingPress}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'social_leaderboard.my_profile.following_tab',
            { count: followingCount },
          )}
          testID={MyProfileViewSelectorsIDs.FOLLOWING_BUTTON}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={MyProfileViewSelectorsIDs.FOLLOWING_COUNT}
            >
              {followingCount}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.my_profile.following')}
            </Text>
          </Box>
        </Pressable>
      </Box>

      {profile.xHandle || joinedLabel ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
          paddingTop={2}
          testID={MyProfileViewSelectorsIDs.META_ROW}
        >
          {profile.xHandle ? (
            <Pressable
              onPress={handleXPress}
              accessibilityRole="link"
              accessibilityLabel={strings(
                'social_leaderboard.trader_profile.twitter_link',
              )}
              testID={MyProfileViewSelectorsIDs.X_LINK}
            >
              <ProfileMetaItem
                iconName={IconName.Link}
                label={strings('social_leaderboard.my_profile.x_link')}
              />
            </Pressable>
          ) : null}
          {joinedLabel ? (
            <ProfileMetaItem
              iconName={IconName.Calendar}
              label={joinedLabel}
              testID={MyProfileViewSelectorsIDs.JOINED}
            />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
};

export default MyProfileHeader;
