import { IconSize } from '../../Icon';
import { AvatarBaseProps, AvatarBaseSize } from '../AvatarBase';

/**
 * AvatarFavicon component props.
 */
export interface AvatarFaviconProps extends AvatarBaseProps {
  /**
   * An icon URL
   */
  imageUrl: string;
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
