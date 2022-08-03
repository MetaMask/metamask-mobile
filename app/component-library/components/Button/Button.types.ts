import {
  StyleProp,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { IconProps } from '../Icon';

export enum ButtonSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
}

/**
 * Button component props.
 */
export interface ButtonProps extends TouchableOpacityProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Color of label. Applies to icon too.
   */
  labelColor?: string;
  /**
   * Button icon.
   */
  icon?: IconProps['name'];
  /**
   * Size of the button.
   */
  size: ButtonSize;
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
 * Button component style sheet.
 */
export interface ButtonStyleSheet {
  base: ViewStyle;
  icon: ViewStyle;
  label: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonStyleSheetVars = Pick<
  ButtonProps,
  'style' | 'size' | 'labelColor'
>;
