// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CoinPatternProps } from '../../../patterns/Coins/Coin';

/**
 * Network sizes.
 */
export { CoinPatternSizes as NetworkSizes } from '../../../patterns/Coins/Coin/Coin.types';

/**
 * Network component props.
 */
export type NetworkProps = CoinPatternProps & {
  /**
   * Props for the image content.
   */
  imageProps?: ImagePropsBase;
  /**
   * Optional network name.
   */
  name?: string;
};

/**
 * Style sheet input parameters.
 */
export type NetworkStyleSheetVars = Pick<NetworkProps, 'style' | 'size'>;
