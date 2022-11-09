// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Coin sizes.
 */
export enum CoinSizes {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Coin component props.
 */
export interface CoinProps extends ViewProps {
  /**
   * Optional enum to select between Coin sizes.
   * @default Md
   */
  size?: CoinSizes;
}

/**
 * Style sheet input parameters.
 */
export type CoinStyleSheetVars = Pick<CoinProps, 'style' | 'size'>;
