// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariants } from '../../Avatar.types';

/**
 * AvatarImage component props.
 */
export type AvatarImageProps = AvatarBaseProps & {
  /**
   * Avatar variants.
   */
  variant?: AvatarVariants.Image;
  /**
   * Props for the image content.
   */
  imageProps: ImagePropsBase;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  isHaloEnabled?: boolean;
};

/**
 * Style sheet input parameters.
 */
export type AvatarImageStyleSheetVars = Pick<
  AvatarImageProps,
  'size' | 'isHaloEnabled'
>;
