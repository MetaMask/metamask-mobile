import React from 'react';
import {
  AvatarBase,
  AvatarBaseShape,
  Icon,
  IconColor,
  IconName,
  ImageOrSvg,
  type ImageOrSvgProps,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';

/** Diameter in pixels used when the caller does not specify one. */
export const DEFAULT_PROFILE_AVATAR_SIZE = 64;

/**
 * Share of the avatar diameter the placeholder glyph fills. `IconSize` tops
 * out at 32px, too small for a 64px avatar, so size from the diameter. Just
 * under 1 keeps the stroke clear of the circle's clipping edge.
 */
const PLACEHOLDER_GLYPH_RATIO = 0.9;

interface ProfileAvatarProps {
  /**
   * A local asset import, a local SVG component, or `{ uri }`. Omit when the
   * profile has no picture — a neutral placeholder renders instead.
   */
  src?: ImageOrSvgSrc;
  /** Diameter in pixels. Defaults to {@link DEFAULT_PROFILE_AVATAR_SIZE}. */
  size?: number;
  /** Optional Tailwind classes for the circle itself, e.g. a background color. */
  twClassName?: string;
  /** Passthrough to the underlying image, e.g. `{ contentFit: 'contain' }`. */
  imageProps?: ImageOrSvgProps['imageProps'];
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A circular avatar holding a caller-supplied image, rather than art generated
 * from an address as `AvatarAccount` does. The image is clipped to a circle and
 * cropped to fill it; with no `src`, a neutral person glyph stands in.
 */
const ProfileAvatar = ({
  src,
  size = DEFAULT_PROFILE_AVATAR_SIZE,
  twClassName,
  imageProps,
  accessibilityLabel,
  testID,
}: ProfileAvatarProps) => (
  <AvatarBase
    shape={AvatarBaseShape.Circle}
    twClassName={twClassName}
    style={{ width: size, height: size }}
    accessible
    accessibilityRole="image"
    accessibilityLabel={accessibilityLabel}
    testID={testID}
  >
    {src ? (
      <ImageOrSvg
        src={src}
        width={size}
        height={size}
        imageProps={{ contentFit: 'cover', ...imageProps }}
      />
    ) : (
      <Icon
        name={IconName.UserCircle}
        color={IconColor.IconAlternative}
        // `style` is flattened after the size class, so this wins over `size`.
        style={{
          width: Math.round(size * PLACEHOLDER_GLYPH_RATIO),
          height: Math.round(size * PLACEHOLDER_GLYPH_RATIO),
        }}
      />
    )}
  </AvatarBase>
);

export default ProfileAvatar;
