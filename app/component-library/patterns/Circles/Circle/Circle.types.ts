// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * CirclePattern sizes.
 */
export enum CirclePatternSizes {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * CirclePattern component props.
 */
export interface CirclePatternProps extends ViewProps {
  /**
   * Optional enum to select between CirclePattern sizes.
   * @default Md
   */
  size?: CirclePatternSizes;
}

/**
 * Style sheet input parameters.
 */
export type CirclePatternStyleSheetVars = Pick<
  CirclePatternProps,
  'style' | 'size'
>;
