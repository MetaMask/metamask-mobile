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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Linking, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { strings } from '../../../../../../locales/i18n';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import ProfileAvatar from './ProfileAvatar';

import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';

import type { MySocialProfile } from '../hooks/useMyProfile';
import { formatJoinedLabel } from '../utils/formatJoinedLabel';
import type { OverlayedMyProfileStats } from '../utils/overlayMyProfileLiveStats';

const CalendarBlankIcon = () => {
  const tw = useTailwind();

  return (
    <Svg
      viewBox="0 0 256 256"
      fill="currentColor"
      style={tw.style(IconColor.IconAlternative, 'w-4 h-4')}
    >
      <Path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
    </Svg>
  );
};

interface MyProfileHeaderProps {
  profile: MySocialProfile;
  overlayedStats: OverlayedMyProfileStats;
  followingCount: number;
  isOwner?: boolean;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

const MyProfileHeader: React.FC<MyProfileHeaderProps> = ({
  profile,
  overlayedStats,
  followingCount,
  isOwner = true,
  onFollowersPress,
  onFollowingPress,
}) => {
  const handleXPress = useCallback(() => {
    if (profile.xHandle) {
      Linking.openURL(`https://x.com/${profile.xHandle}`);
    }
  }, [profile.xHandle]);

  const joinedLabel = formatJoinedLabel(profile.joinedAt);

  return (
    <Box paddingHorizontal={4} paddingBottom={4}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        {isOwner ? (
          <ProfileAvatar
            imageUrl={profile.imageUrl}
            avatarPresetId={profile.avatarPresetId}
            avatarBackgroundId={profile.avatarBackgroundId}
            size="lg"
            accessibilityLabel={strings(
              'social_leaderboard.my_profile.avatar_accessibility_label',
            )}
            testID={MyProfileViewSelectorsIDs.AVATAR}
          />
        ) : (
          <TraderAvatar
            imageUrl={profile.imageUrl}
            address={profile.linkedAccountAddress ?? undefined}
            size={64}
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
            {profile.xHandle ? (
              <Pressable
                onPress={handleXPress}
                accessibilityRole="link"
                accessibilityLabel={strings(
                  'social_leaderboard.trader_profile.twitter_link',
                )}
                testID={MyProfileViewSelectorsIDs.X_LINK}
              >
                <Icon name={IconName.X} size={IconSize.Md} twClassName="mt-1" />
              </Pressable>
            ) : null}
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID={MyProfileViewSelectorsIDs.HANDLE}
          >
            @{profile.handle}
          </Text>
        </Box>
      </Box>

      {profile.bio ? (
        <Text
          variant={TextVariant.BodyMd}
          twClassName="pt-4"
          testID={MyProfileViewSelectorsIDs.BIO}
        >
          {profile.bio}
        </Text>
      ) : null}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        paddingTop={6}
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
              variant={TextVariant.BodyMd}
              testID={MyProfileViewSelectorsIDs.FOLLOWERS_COUNT}
            >
              {overlayedStats.followerCount}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.my_profile.followers')}
            </Text>
          </Box>
        </Pressable>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
              variant={TextVariant.BodyMd}
              testID={MyProfileViewSelectorsIDs.FOLLOWING_COUNT}
            >
              {followingCount}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.my_profile.following')}
            </Text>
          </Box>
        </Pressable>
      </Box>

      {joinedLabel ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          paddingTop={2}
          testID={MyProfileViewSelectorsIDs.JOINED}
        >
          <CalendarBlankIcon />
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {joinedLabel}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default MyProfileHeader;
