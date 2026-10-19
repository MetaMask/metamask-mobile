import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
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
const ART_SCALE = 0.85;

interface ProfileAvatarArtProps {
  preset: ProfileAvatarPreset | undefined;
  sizePx: number;
  testID?: string;
}

/**
 * Preset artwork without its own backdrop, for drawing over a picked color.
 */
export const ProfileAvatarArt: React.FC<ProfileAvatarArtProps> = ({
  preset,
  sizePx,
  testID,
}) => {
  const tw = useTailwind();
  return (
    <Image
      source={preset?.source ?? superheroAvatar}
      style={tw.style({ width: sizePx, height: sizePx })}
      resizeMode="contain"
      testID={testID}
    />
  );
};

interface ProfileAvatarProps {
  imageUrl?: string | null;
  avatarPresetId?: string | null;
  /**
   * Backdrop color id from `PROFILE_AVATAR_BACKGROUNDS`. Presets without a
   * saved color use the default backdrop.
   */
  avatarBackgroundId?: string | null;
  size?: ProfileAvatarSize;
  /** Overrides the named size, in points. */
  diameter?: number;
  testID?: string;
  accessibilityLabel?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  imageUrl,
  avatarPresetId,
  avatarBackgroundId,
  size = 'lg',
  diameter,
  testID,
  accessibilityLabel,
}) => {
  const tw = useTailwind();
  const preset = getProfileAvatarPreset(avatarPresetId);
  const diameterPx = diameter ?? SIZE_PX[size];
  const sizeClassName = diameter ? '' : SIZE_CLASS[size];
  const sizeStyle = diameter
    ? { width: diameter, height: diameter }
    : undefined;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        accessibilityLabel={accessibilityLabel}
        style={tw.style(sizeClassName, 'rounded-full', sizeStyle)}
        testID={testID}
      />
    );
  }

  if (!preset) {
    return (
      <Image
        source={superheroAvatar}
        accessibilityLabel={accessibilityLabel}
        style={tw.style(sizeClassName, 'rounded-full', sizeStyle)}
        testID={testID}
      />
    );
  }

  const background =
    getProfileAvatarBackground(avatarBackgroundId) ??
    getProfileAvatarBackground(DEFAULT_PROFILE_AVATAR_BACKGROUND_ID);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName={`${sizeClassName} rounded-full overflow-hidden`}
      style={tw.style(sizeStyle, { backgroundColor: background?.color })}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <ProfileAvatarArt
        preset={preset}
        sizePx={diameterPx * ART_SCALE}
        testID={testID ? `${testID}-art` : undefined}
      />
    </Box>
  );
};

export default ProfileAvatar;
