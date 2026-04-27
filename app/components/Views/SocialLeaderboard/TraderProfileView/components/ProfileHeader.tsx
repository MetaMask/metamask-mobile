import React, { useCallback } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  AvatarBase,
  AvatarBaseSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { TraderProfile } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';

const AVATAR_SIZE = 40;

export interface ProfileHeaderProps {
  profile: TraderProfile;
  followerCount: number;
  twitterHandle?: string | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  followerCount,
  twitterHandle,
}) => {
  const tw = useTailwind();

  const handleTwitterPress = useCallback(() => {
    if (twitterHandle) {
      Linking.openURL(`https://x.com/${twitterHandle}`);
    }
  }, [twitterHandle]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      gap={4}
      testID={TraderProfileViewSelectorsIDs.HEADER}
    >
      {profile.imageUrl ? (
        <Image
          source={{ uri: profile.imageUrl }}
          style={tw.style(
            `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
          )}
          resizeMode="cover"
        />
      ) : (
        <AvatarBase
          size={AvatarBaseSize.Lg}
          fallbackText={profile.name.charAt(0).toUpperCase()}
        />
      )}

      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="flex-shrink"
          >
            {profile.name}
          </Text>
          {twitterHandle ? (
            <Pressable
              onPress={handleTwitterPress}
              testID={TraderProfileViewSelectorsIDs.TWITTER_LINK}
              accessibilityRole="link"
              accessibilityLabel={strings(
                'social_leaderboard.trader_profile.twitter_link',
              )}
            >
              <Icon
                name={IconName.X}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            </Pressable>
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings(
            followerCount === 1
              ? 'social_leaderboard.trader_profile.followers_count'
              : 'social_leaderboard.trader_profile.followers_count_plural',
            { count: followerCount },
          )}
        </Text>
      </Box>
    </Box>
  );
};

export default ProfileHeader;
