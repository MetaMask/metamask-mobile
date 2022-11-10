// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * CoinPattern sizes.
 */
export enum CoinPatternSizes {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * CoinPattern component props.
 */
export interface CoinPatternProps extends ViewProps {
  /**
   * Optional enum to select between CoinPattern sizes.
   * @default Md
   */
  size?: CoinPatternSizes;
}

/**
 * Style sheet input parameters.
 */
export type CoinPatternStyleSheetVars = Pick<
  CoinPatternProps,
  'style' | 'size'
>;
