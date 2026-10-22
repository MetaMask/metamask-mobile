import {
  AvatarBaseSize,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import AvatarSocial from '../../../../../component-library/components-temp/AvatarSocial';
import { FOXICON_SIZE_BY_AVATARBASE_SIZE } from '../../../../../component-library/components-temp/AvatarSocial/AvatarSocial.constants';
import Foxicon from '../../../../../component-library/components-temp/Foxicon';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
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

/** Diameters `AvatarSocial` renders natively; others draw a Foxicon on a circle. */
const AVATAR_BASE_SIZE_BY_PX = new Map<number, AvatarBaseSize>(
  (
    Object.entries(FOXICON_SIZE_BY_AVATARBASE_SIZE) as [
      AvatarBaseSize,
      number,
    ][]
  ).map(([avatarBaseSize, px]) => [px, avatarBaseSize]),
);

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
  const artTestID = testID ? `${testID}-art` : undefined;
  const avatarBaseSize = AVATAR_BASE_SIZE_BY_PX.get(diameterPx);

  if (avatarBaseSize && background) {
    return (
      <AvatarSocial
        variant={preset.id}
        backgroundColor={background.id}
        size={avatarBaseSize}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName={`${sizeClassName} rounded-full overflow-hidden`}
      style={tw.style(sizeStyle, { backgroundColor: background?.color })}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <Foxicon variant={preset.id} size={diameterPx} testID={artTestID} />
    </Box>
  );
};

export default ProfileAvatar;
