// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarFavicon component props.
 */
export interface AvatarFaviconProps extends AvatarBaseProps {
  /**
   * A favicon image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
}

/**
 * Style sheet input parameters.
 */
export type AvatarFaviconStyleSheetVars = Pick<AvatarFaviconProps, 'style'>;
