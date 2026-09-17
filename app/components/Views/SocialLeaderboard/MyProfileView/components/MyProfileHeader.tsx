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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { MySocialProfile, ProfileRankingTag } from '../hooks/useMyProfile';

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
}

const MyProfileHeader: React.FC<MyProfileHeaderProps> = ({ profile }) => {
  const tw = useTailwind();
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
        <Image
          source={
            profile.imageUrl ? { uri: profile.imageUrl } : superheroAvatar
          }
          accessibilityLabel={strings(
            'social_leaderboard.my_profile.avatar_accessibility_label',
          )}
          style={tw.style('w-16 h-16 rounded-full')}
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
        <Text
          variant={TextVariant.BodyMd}
          testID={MyProfileViewSelectorsIDs.FOLLOWERS_COUNT}
        >
          {profile.followerCount ?? 0}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.my_profile.followers')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          ·
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          testID={MyProfileViewSelectorsIDs.FOLLOWING_COUNT}
        >
          {profile.followingCount ?? 0}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.my_profile.following')}
        </Text>
      </Box>
    </Box>
  );
};

export default MyProfileHeader;
