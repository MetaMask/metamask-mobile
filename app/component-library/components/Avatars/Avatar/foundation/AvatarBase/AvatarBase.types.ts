// Third party dependencies.
import { ColorValue, ViewProps } from 'react-native';

// External dependencies
import { AvatarSizes } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Optional enum to select between Avatar sizes.
   * @default Md
   */
  size?: AvatarSizes;
  /**
   * Optional enum to add color to the background of the Avatar.
   * @default 'default'
   */
  backgroundColor?: ColorValue;
}

/**
 * Style sheet input parameters.
 */
export type AvatarBaseStyleSheetVars = Pick<
  AvatarBaseProps,
  'style' | 'size' | 'backgroundColor'
>;
