import { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { BaseButtonProps, BaseButtonSize } from '../BaseButton';

/**
 * BaseButton component props.
 */
export interface ButtonPrimaryProps extends ViewProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Button icon.
   */
  icon?: BaseButtonProps['icon'];
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
 * ButtonPrimary component style sheet.
 */
export interface ButtonPrimaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonPrimaryStyleSheetVars = Pick<ButtonPrimaryProps, 'style'>;
