// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarBaseProps } from '../AvatarBase/AvatarBase.types';

/**
 * AvatarToken component props.
 */
export interface AvatarTokenProps extends AvatarBaseProps {
  /**
   * Optional token name.
   */
  name?: string;
  /**
   * Optional token image from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  isHaloEnabled?: boolean;
}

export type AvatarTokenStyleSheetVars = Pick<
  AvatarTokenProps,
  'size' | 'isHaloEnabled' | 'style'
> & {
  showFallback: boolean;
};
