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
 * Share of the avatar diameter the placeholder glyph fills.
 *
 * `IconSize` tops out at 32px, which leaves a visible gap inside a 64px
 * avatar, so the glyph is sized from the diameter instead. Just under 1 keeps
 * the stroke clear of the circle's clipping edge.
 */
const PLACEHOLDER_GLYPH_RATIO = 0.9;

interface ProfileAvatarProps {
  /**
   * The image to display: a local asset import, a local SVG component, or
   * `{ uri }` for a remote image. Omit when the profile has no picture yet —
   * a neutral placeholder is rendered instead.
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
 * A circular avatar holding a custom profile image.
 *
 * Unlike `AvatarAccount`, the art is supplied by the caller rather than
 * generated from an address. The image is clipped to a circle and, by default,
 * cropped to fill it. With no `src`, a neutral person glyph stands in.
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
