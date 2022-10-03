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
export enum AvatarVariants {
  Account = 'Account',
  Favicon = 'Favicon',
  Icon = 'Icon',
  Network = 'Network',
  Token = 'Token',
}
/**
 * Avatar component props.
 */
export type AvatarProps =
  | AvatarAccountProps
  | AvatarFaviconProps
  | AvatarIconProps
  | AvatarNetworkProps
  | AvatarTokenProps;
