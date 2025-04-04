// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase/AvatarBase.types';

/**
 * AvatarNetwork component props.
 */
export interface AvatarNetworkProps extends AvatarBaseProps {
  /**
   * Optional network name.
   */
  name?: string;
  /**
   * Optional network image from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
}

export interface AvatarNetworkStyleSheetVars
  extends Pick<AvatarNetworkProps, 'size' | 'style'> {
  showFallback: boolean;
}
