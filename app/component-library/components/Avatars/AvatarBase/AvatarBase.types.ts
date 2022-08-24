// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarVariants } from '../Avatar.types';

/**
 * AvatarBase sizes.
 */
export enum AvatarBaseSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants;
  /**
   * Optional enum to select between AvatarBase sizes.
   * @default Md
   */
  size?: AvatarBaseSize;
}

/**
 * Style sheet input parameters.
 */
export interface AvatarBaseStyleSheetVars
  extends Pick<AvatarBaseProps, 'style'> {
  size: AvatarBaseSize;
}
