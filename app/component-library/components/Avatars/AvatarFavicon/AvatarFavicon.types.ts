// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconSize } from '../../Icon';
import { AvatarBaseProps, AvatarBaseSize } from '../AvatarBase';

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
export interface AvatarFaviconStyleSheetVars
  extends Pick<AvatarFaviconProps, 'style'> {
  error: any;
}

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarBaseSize]: IconSize;
};
