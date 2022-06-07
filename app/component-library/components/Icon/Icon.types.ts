import { ViewProps } from 'react-native';

/**
 * Icon sizes
 */
export enum IconSize {
  Xss = '10',
  Xs = '12',
  Sm = '16',
  Md = '20',
  Lg = '24',
  Xl = '32',
}

/**
 * Icon names
 */
export enum IconName {
  Medal = 'medal',
}

/**
 * Icon component props.
 */
export interface IconProps extends ViewProps {
  /**
   * Enum to select between icon sizes.
   */
  size: IconSize;
  /**
   * Enum to select between icon names.
   */
  name: IconName;
}

/**
 * Style sheet input parameters.
 */
export type IconStyleSheetVars = Pick<IconProps, 'size' | 'style'>;
