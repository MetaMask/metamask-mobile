// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase/AvatarBase.types';
import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../../../../constants/network';

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
  /**
   * Optional network image from either a local or remote source.
   */
  chainId: NETWORKS_CHAIN_ID_WITH_SVG;
}

export interface AvatarNetworkStyleSheetVars
  extends Pick<AvatarNetworkProps, 'size' | 'style'> {
  showFallback: boolean;
}
