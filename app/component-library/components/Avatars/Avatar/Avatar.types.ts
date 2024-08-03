// External dependencies.
import { IconSize } from '../../Icons/Icon';
import { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { AvatarAccountProps } from './variants/AvatarAccount/AvatarAccount.types';
import { AvatarFaviconProps } from './variants/AvatarFavicon/AvatarFavicon.types';
import { AvatarIconProps } from './variants/AvatarIcon/AvatarIcon.types';
import { AvatarNetworkProps } from './variants/AvatarNetwork/AvatarNetwork.types';
import { AvatarTokenProps } from './variants/AvatarToken/AvatarToken.types';

/**
 * Avatar sizes.
 */
export enum AvatarSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Avatar variants.
 */
export enum AvatarVariant {
  Account = 'Account',
  Favicon = 'Favicon',
  Icon = 'Icon',
  Network = 'Network',
  Token = 'Token',
}
/**
 * Avatar component props.
 */
export type AvatarProps = (
  | AvatarAccountProps
  | AvatarFaviconProps
  | AvatarIconProps
  | AvatarNetworkProps
  | AvatarTokenProps
) & {
  /**
   * Variant of Avatar
   */
  variant: AvatarVariant;
};

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};

/**
 * Mapping of TextVariant by AvatarSize.
 */
export type TextVariantByAvatarSize = {
  [key in AvatarSize]: TextVariant;
};

/**
 * Mapping of borderWidth by AvatarSize.
 */
export type BorderWidthByAvatarSize = {
  [key in AvatarSize]: number;
};
