// Third party dependencies.
import { ImagePropsBase } from 'react-native';
import { CirclePatternProps } from '../../../../../patterns/Circles/Circle';

// External dependencies.
import { AvatarVariants } from '../../Avatar.types';

/**
 * AvatarImage component props.
 */
export type AvatarImageProps = CirclePatternProps & {
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
