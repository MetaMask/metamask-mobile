import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { Linking, Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import ProfileAvatar from './ProfileAvatar';
import type { MySocialProfile, ProfileRankingTag } from '../hooks/useMyProfile';
import MyProfileStats from './MyProfileStats';

const RANKING_TAG_DISPLAY: Record<
  ProfileRankingTag,
  { emoji: string; label: string }
> = {
  shrimp: { emoji: '🦐', label: 'Shrimp' },
  dolphin: { emoji: '🐬', label: 'Dolphin' },
  whale: { emoji: '🐋', label: 'Whale' },
};

interface MyProfileHeaderProps {
  profile: MySocialProfile;
  followingCount: number;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  onStatsPress?: () => void;
}

const MyProfileHeader: React.FC<MyProfileHeaderProps> = ({
  profile,
  followingCount,
  onFollowersPress,
  onFollowingPress,
  onStatsPress,
}) => {
  const handleXPress = useCallback(() => {
    if (profile.xHandle) {
      Linking.openURL(`https://x.com/${profile.xHandle}`);
    }
  }, [profile.xHandle]);

  const rankingTag = profile.rankingTag
    ? RANKING_TAG_DISPLAY[profile.rankingTag]
    : null;

  return (
    <Box paddingHorizontal={4} paddingBottom={4}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <ProfileAvatar
          imageUrl={profile.imageUrl}
          avatarPresetId={profile.avatarPresetId}
          size="lg"
          accessibilityLabel={strings(
            'social_leaderboard.my_profile.avatar_accessibility_label',
          )}
          testID={MyProfileViewSelectorsIDs.AVATAR}
        />

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
            {rankingTag ? (
              <Tag
                severity={TagSeverity.Neutral}
                testID={MyProfileViewSelectorsIDs.RANKING_TAG}
                twClassName="mt-2"
              >
                {`${rankingTag.emoji} ${rankingTag.label}`}
              </Tag>
            ) : null}
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
            { count: profile.followerCount ?? 0 },
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
              {profile.followerCount ?? 0}
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

      <MyProfileStats profile={profile} onPress={onStatsPress} />
    </Box>
  );
};

export default MyProfileHeader;
