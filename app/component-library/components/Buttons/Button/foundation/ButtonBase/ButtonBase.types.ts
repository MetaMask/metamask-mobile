// Third party dependencies.
import { ColorValue, TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../../../Icon';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../Button.types';

/**
 * ButtonBase component props.
 */
export interface ButtonBaseProps extends TouchableOpacityProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Variant of Button
   */
  variant?: ButtonVariants;
  /**
   * Color of label. Applies to icon too.
   */
  labelColor?: string | ColorValue;
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName?: IconProps['name'];
  /**
   * Size of the button.
   */
  size?: ButtonSize;
  /**
   * Function to trigger when pressing the button.
   */
  onPress: () => void;
  /**
   * Optional boolean to show the danger state of the button.
   */
  isDanger?: boolean;
  /**
   * Optional param to control the width of the button.
   */
  width?: ButtonWidthTypes | number;
}
