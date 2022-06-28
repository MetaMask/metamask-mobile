import {
  StyleProp,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { IconProps } from '../Icon';

export enum BaseButtonSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
}

/**
 * BaseButton component props.
 */
export interface BaseButtonProps extends TouchableOpacityProps {
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
  label: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type BaseButtonStyleSheetVars = Pick<
  BaseButtonProps,
  'style' | 'size' | 'labelColor'
>;
