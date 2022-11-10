// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CoinPatternProps } from '../../../patterns/Coins/Coin';

/**
 * Token sizes.
 */
export { CoinPatternSizes as TokenSizes } from '../../../patterns/Coins/Coin/Coin.types';

/**
 * Token component props.
 */
export type TokenProps = CoinPatternProps & {
  /**
   * Optional token name.
   */
  name?: string;
  /**
   * Props for the image content.
   */
  imageProps: ImagePropsBase;
  /**
   * Optional boolean to activate halo effect.
   * @default true
   */
  isHaloEnabled?: boolean;
};

/**
 * Style sheet input parameters.
 */
export type TokenStyleSheetVars = Pick<
  TokenProps,
  'style' | 'size' | 'isHaloEnabled'
>;
