// External dependencies.
import { AvatarIconProps } from './variants/AvatarIcon/AvatarIcon.types';
import { AvatarImageProps } from './variants/AvatarImage/AvatarImage.types';
import { AvatarInitialProps } from './variants/AvatarInitial/AvatarInitial.types';

/**
 * Avatar sizes.
 */
export enum AvatarSizes {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Avatar Badge Position.
 */
export enum AvatarBadgePositions {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
}

/**
 * Avatar variants.
 */
export enum AvatarVariants {
  Icon = 'Icon',
  Image = 'Image',
  Initial = 'Initial',
}

/**
 * Avatar component props.
 */
export type AvatarProps =
  | AvatarIconProps
  | AvatarImageProps
  | AvatarInitialProps;
