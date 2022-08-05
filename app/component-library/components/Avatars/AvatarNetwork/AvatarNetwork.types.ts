// External dependencies.
import { AvatarBaseProps } from '../AvatarBase/AvatarBase.types';

/**
 * AvatarNetwork component props.
 */
export interface AvatarNetworkProps extends AvatarBaseProps {
  /**
   * Chain name.
   */
  networkName?: string;
  /**
   * Chain image URL.
   */
  networkImageUrl?: string;
}

export interface AvatarNetworkStyleSheetVars
  extends Pick<AvatarNetworkProps, 'size' | 'style'> {
  showPlaceholder: boolean;
}
