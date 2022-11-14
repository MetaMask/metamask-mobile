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
   * Props for the image content rendered inside the AvatarImage.
   */
  imageProps: ImagePropsBase;
};

/**
 * Style sheet input parameters.
 */
export type AvatarImageStyleSheetVars = Pick<AvatarImageProps, 'size'>;
