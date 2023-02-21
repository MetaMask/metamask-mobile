// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconSize } from '../../../../Icons/Icon';
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariants, AvatarSize } from '../../Avatar.types';

/**
 * AvatarFavicon component props.
 */
export interface AvatarFaviconProps extends AvatarBaseProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Favicon;
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
  [key in AvatarSize]: IconSize;
};
