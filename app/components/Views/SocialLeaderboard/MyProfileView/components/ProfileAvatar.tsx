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
import {
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  type ProfileAvatarPreset,
} from '../avatarPresets';

type ProfileAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ProfileAvatarSize, string> = {
  xs: 'w-5 h-5',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const SIZE_PX: Record<ProfileAvatarSize, number> = {
  xs: 20,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 96,
};

/** Share of the circle the artwork fills when drawn over a backdrop color. */
const ART_SCALE = 0.72;

const EMOJI_VARIANT: Record<ProfileAvatarSize, TextVariant> = {
  xs: TextVariant.BodySm,
  sm: TextVariant.BodyMd,
  md: TextVariant.HeadingSm,
  lg: TextVariant.HeadingMd,
  xl: TextVariant.HeadingLg,
};

interface ProfileAvatarArtProps {
  preset: ProfileAvatarPreset | undefined;
  sizePx: number;
}

/**
 * Preset artwork without its own backdrop, for drawing over a picked color.
 */
export const ProfileAvatarArt: React.FC<ProfileAvatarArtProps> = ({
  preset,
  sizePx,
}) => {
  const tw = useTailwind();

  if (preset?.kind === 'emoji') {
    return (
      <Text
        style={tw.style({
          fontSize: sizePx * 0.6,
          lineHeight: sizePx * 0.75,
          textAlign: 'center',
        })}
      >
        {preset.emoji}
      </Text>
    );
  }

  return (
    <Image
      source={preset?.kind === 'image' ? preset.artSource : superheroAvatar}
      style={tw.style({ width: sizePx, height: sizePx })}
      resizeMode="contain"
    />
  );
};

interface ProfileAvatarProps {
  imageUrl?: string | null;
  avatarPresetId?: string | null;
  /** Backdrop color id from `PROFILE_AVATAR_BACKGROUNDS`. */
  avatarBackgroundId?: string | null;
  size?: ProfileAvatarSize;
  testID?: string;
  accessibilityLabel?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  imageUrl,
  avatarPresetId,
  avatarBackgroundId,
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

  const background = getProfileAvatarBackground(avatarBackgroundId);
  if (background) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName={`${sizeClassName} rounded-full overflow-hidden`}
        style={tw.style({ backgroundColor: background.color })}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        <ProfileAvatarArt preset={preset} sizePx={SIZE_PX[size] * ART_SCALE} />
      </Box>
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
