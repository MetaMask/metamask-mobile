// Internal dependencies.
import { AvatarAccountProps } from './variants/AvatarAccount/AvatarAccount.types';
import { AvatarFaviconProps } from './variants/AvatarFavicon/AvatarFavicon.types';
import { AvatarJazzIconProps } from './variants/AvatarJazzIcon/AvatarJazzIcon.types';
import { AvatarNetworkProps } from './variants/AvatarNetwork/AvatarNetwork.types';
import { AvatarTokenProps } from './variants/AvatarToken/AvatarToken.types';

/**
 * Avatar variants.
 */
export enum AvatarVariants {
  Account = 'Account',
  Favicon = 'Favicon',
  JazzIcon = 'JazzIcon',
  Network = 'Network',
  Token = 'Token',
}

/**
 * Avatar Badge Position.
 */
export enum AvatarBadgePositions {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
}

/**
 * Avatar component props.
 */
export type AvatarProps =
  | AvatarAccountProps
  | AvatarFaviconProps
  | AvatarJazzIconProps
  | AvatarNetworkProps
  | AvatarTokenProps;

export { AvatarSizes } from '../../../../component-library/components/Avatars/Avatar';
