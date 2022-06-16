import { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { IconName } from '../Icon';

export enum BaseButtonSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
}

/**
 * BaseButton component props.
 */
export interface BaseButtonProps extends ViewProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Button icon.
   */
  iconName?: IconName;
  /**
   * Size of the button.
   */
  size: BaseButtonSize;
  /**
   * Function to trigger when pressing the button.
   */
  onPress: () => void;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * BaseButton component style sheet.
 */
export interface BaseButtonStyleSheet {
  base: ViewStyle;
  icon: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type BaseButtonStyleSheetVars = Pick<BaseButtonProps, 'style' | 'size'>;
