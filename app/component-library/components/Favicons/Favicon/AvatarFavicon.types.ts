// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariants } from '../../Avatar.types';

/**
 * AvatarFavicon component props.
 */
export type AvatarFaviconProps = AvatarBaseProps & {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Favicon;
  /**
   * A favicon image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
};
