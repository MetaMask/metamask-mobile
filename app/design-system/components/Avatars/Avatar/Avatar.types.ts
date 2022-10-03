// Internal dependencies.
import { AvatarAccountProps } from './variants/AvatarAccount/AvatarAccount.types';
import { AvatarFaviconProps } from './variants/AvatarFavicon/AvatarFavicon.types';
import { AvatarNetworkProps } from './variants/AvatarNetwork/AvatarNetwork.types';
import { AvatarTokenProps } from './variants/AvatarToken/AvatarToken.types';

/**
 * Avatar variants.
 */
export enum AvatarVariants {
  Account = 'Account',
  Favicon = 'Favicon',
  Network = 'Network',
  Token = 'Token',
}
/**
 * Avatar component props.
 */
export type AvatarProps =
  | AvatarAccountProps
  | AvatarFaviconProps
  | AvatarNetworkProps
  | AvatarTokenProps;
