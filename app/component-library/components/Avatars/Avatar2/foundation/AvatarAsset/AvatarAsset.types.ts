// External dependencies.
import { AvatarAssetIconProps } from './variants/AvatarAssetIcon/AvatarAssetIcon.types';
import { AvatarAssetImageProps } from './variants/AvatarAssetImage/AvatarAssetImage.types';
import { AvatarAssetInitialProps } from './variants/AvatarAssetInitial/AvatarAssetInitial.types';
import { AvatarAssetJazzIconProps } from './variants/AvatarAssetJazzIcon/AvatarAssetJazzIcon.types';

/**
 * Avatar Asset variants.
 */
export enum AvatarAssetVariants {
  Icon = 'Icon',
  Image = 'Image',
  Initial = 'Initial',
  JazzIcon = 'JazzIcon',
}

/**
 * Avatar Asset component props.
 */
export type AvatarAssetProps =
  | AvatarAssetIconProps
  | AvatarAssetImageProps
  | AvatarAssetInitialProps
  | AvatarAssetJazzIconProps;
