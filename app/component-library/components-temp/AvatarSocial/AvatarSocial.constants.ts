import { AvatarBaseSize } from '@metamask/design-system-react-native';
import { BrandColor } from '@metamask/design-tokens';

import { AvatarSocialBackgroundColor } from './AvatarSocial.types';

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
 * Maps each background color slot to its MMDS brand color token.
 */
export const BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR: Record<
  AvatarSocialBackgroundColor,
  keyof BrandColor
> = {
  [AvatarSocialBackgroundColor.Background1]: 'orange200',
  [AvatarSocialBackgroundColor.Background2]: 'purple100',
  [AvatarSocialBackgroundColor.Background3]: 'purple300',
  [AvatarSocialBackgroundColor.Background4]: 'indigo200',
  [AvatarSocialBackgroundColor.Background5]: 'indigo500',
  [AvatarSocialBackgroundColor.Background6]: 'lime025',
  [AvatarSocialBackgroundColor.Background7]: 'lime100',
};
