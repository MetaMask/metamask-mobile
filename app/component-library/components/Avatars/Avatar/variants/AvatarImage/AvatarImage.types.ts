// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariants } from '../../Avatar.types';

/**
 * AvatarImage component props.
 */
export interface AvatarImageProps extends AvatarBaseProps {
  /**
   * Avatar variants.
   */
  variant: AvatarVariants.Image;
  /**
   * Optional token image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  isHaloEnabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type AvatarImageStyleSheetVars = Pick<
  AvatarImageProps,
  'size' | 'style' | 'isHaloEnabled'
>;
