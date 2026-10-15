import { AvatarBaseSize } from '@metamask/design-system-react-native';

/**
 * Maps each AvatarBaseSize to the pixel size the nested Foxicon should
 * render at, matching AvatarBase's own documented dimensions.
 */
export const FOXICON_SIZE_BY_AVATARBASE_SIZE: Record<AvatarBaseSize, number> = {
  [AvatarBaseSize.Xs]: 16,
  [AvatarBaseSize.Sm]: 24,
  [AvatarBaseSize.Md]: 32,
  [AvatarBaseSize.Lg]: 40,
  [AvatarBaseSize.Xl]: 48,
};

/**
 * Mirrors AvatarBase's own default size.
 */
export const DEFAULT_AVATARSOCIAL_SIZE = AvatarBaseSize.Md;
