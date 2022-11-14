// External dependencies.
import { AvatarBlockiesProps } from './variants/AvatarBlockies/AvatarBlockies.types';
import { AvatarImageProps } from './variants/AvatarImage/AvatarImage.types';
import { AvatarInitialProps } from './variants/AvatarInitial/AvatarInitial.types';
import { AvatarJazzIconProps } from './variants/AvatarJazzIcon/AvatarJazzIcon.types';

/**
 * Avatar sizes and badge positions.
 */
export {
  CirclePatternSizes as AvatarSizes,
  CirclePatternBadgePositions as AvatarBadgePositions,
} from '../../../patterns/Circles/Circle/Circle.types';

/**
 * Avatar variants.
 */
export enum AvatarVariants {
  Blockies = 'Blockies',
  Image = 'Image',
  Initial = 'Initial',
  JazzIcon = 'JazzIcon',
}

/**
 * Avatar component props.
 */
export type AvatarProps = (
  | AvatarBlockiesProps
  | AvatarImageProps
  | AvatarInitialProps
  | AvatarJazzIconProps
) & {
  /**
   * Avatar variants.
   */
  variant: AvatarVariants;
};
