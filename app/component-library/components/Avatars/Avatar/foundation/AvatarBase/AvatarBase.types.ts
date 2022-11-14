// Third party dependencies.
import { CirclePatternProps } from '../../../../../patterns/Circles/Circle';

// External dependencies
import { AvatarSizes } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends Omit<CirclePatternProps, 'size'> {
  /**
   * Optional enum to select between Avatar sizes.
   * @default Md
   */
  size?: AvatarSizes;
}

/**
 * Style sheet input parameters.
 */
export type AvatarBaseStyleSheetVars = Pick<AvatarBaseProps, 'style'>;
