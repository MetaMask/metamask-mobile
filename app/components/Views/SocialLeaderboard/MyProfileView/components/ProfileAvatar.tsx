import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import { getProfileAvatarPreset } from '../avatarPresets';

type ProfileAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ProfileAvatarSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const EMOJI_VARIANT: Record<ProfileAvatarSize, TextVariant> = {
  sm: TextVariant.BodyMd,
  md: TextVariant.HeadingSm,
  lg: TextVariant.HeadingMd,
  xl: TextVariant.HeadingLg,
};

interface ProfileAvatarProps {
  imageUrl?: string | null;
  avatarPresetId?: string | null;
  size?: ProfileAvatarSize;
  testID?: string;
  accessibilityLabel?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  imageUrl,
  avatarPresetId,
  size = 'lg',
  testID,
  accessibilityLabel,
}) => {
  const tw = useTailwind();
  const preset = getProfileAvatarPreset(avatarPresetId);
  const sizeClassName = SIZE_CLASS[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        accessibilityLabel={accessibilityLabel}
        style={tw.style(sizeClassName, 'rounded-full')}
        testID={testID}
      />
    );
  }

  if (preset?.kind === 'emoji') {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName={`${sizeClassName} rounded-full ${preset.backgroundClassName}`}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        <Text variant={EMOJI_VARIANT[size]}>{preset.emoji}</Text>
      </Box>
    );
  }

  return (
    <Image
      source={preset?.kind === 'image' ? preset.source : superheroAvatar}
      accessibilityLabel={accessibilityLabel}
      style={tw.style(sizeClassName, 'rounded-full')}
      testID={testID}
    />
  );
};

export default ProfileAvatar;
