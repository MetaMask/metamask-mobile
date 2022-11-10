// Third party dependencies.
import { CoinPatternProps } from '../../../../../patterns/Coins/Coin';

// External dependencies
import { AvatarSizes } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends Omit<CoinPatternProps, 'size'> {
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
