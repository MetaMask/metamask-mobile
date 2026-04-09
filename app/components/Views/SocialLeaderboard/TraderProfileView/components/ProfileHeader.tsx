import React from 'react';
import { Image } from 'react-native';
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { TraderProfile } from '@metamask/social-controllers';

const AVATAR_SIZE = 40;

export interface ProfileHeaderProps {
  profile: TraderProfile;
  followerCount: number;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  followerCount,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      gap={4}
      testID="trader-profile-header"
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
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {profile.name}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextMuted}
        >
          {strings('social_leaderboard.trader_profile.followers_count', {
            count: followerCount,
          })}
        </Text>
      </Box>
    </Box>
  );
};

export default ProfileHeader;
