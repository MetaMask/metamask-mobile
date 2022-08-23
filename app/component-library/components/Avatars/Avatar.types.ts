// Internal dependencies.
import { AvatarAccountProps } from './AvatarAccount/AvatarAccount.types';
import { AvatarFaviconProps } from './AvatarFavicon/AvatarFavicon.types';
import { AvatarNetworkProps } from './AvatarNetwork/AvatarNetwork.types';
import { AvatarTokenProps } from './AvatarToken/AvatarToken.types';

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
