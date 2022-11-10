// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CoinPatternProps } from '../../../patterns/Coins/Coin';

/**
 * Favicon sizes.
 */
export { CoinPatternSizes as FaviconSizes } from '../../../patterns/Coins/Coin/Coin.types';

/**
 * Favicon component props.
 */
export type FaviconProps = CoinPatternProps & {
  /**
   * Props for the image content.
   */
  imageProps: ImagePropsBase;
};

/**
 * Style sheet input parameters.
 */
export type FaviconStyleSheetVars = Pick<FaviconProps, 'style' | 'size'>;
