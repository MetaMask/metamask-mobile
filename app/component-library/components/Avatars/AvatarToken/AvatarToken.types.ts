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
  image?: ImageSourcePropType;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  showHalo?: boolean;
}

export type AvatarTokenStyleSheetVars = Pick<
  AvatarTokenProps,
  'size' | 'showHalo' | 'style'
> & {
  showFallback: boolean;
};
