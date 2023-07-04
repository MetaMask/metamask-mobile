// Third party dependencies.
import { ColorValue, TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

/**
 * ButtonBase component props.
 */
export interface ButtonBaseProps extends TouchableOpacityProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Optional prop for the color of label. Applies to icon too.
   */
  labelColor?: string | ColorValue;
  /**
   * Optional prop for the icon name of the icon that will be displayed before the label.
   */
  startIconName?: IconProps['name'];
  /**
   * Optional prop for the icon name of the icon that will be displayed after the label.
   */
  endIconName?: IconProps['name'];
  /**
   * Optional prop for the size of the button.
   */
  size?: ButtonSize;
  /**
   * Function to trigger when pressing the button.
   */
  onPress: () => void;
  /**
   * Optional boolean to show the danger state of the button.
   * @default false
   */
  isDanger?: boolean;
  /**
   * Optional param to control the width of the button.
   */
  width?: ButtonWidthTypes | number;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type ButtonBaseStyleSheetVars = Pick<
  ButtonBaseProps,
  'style' | 'labelColor' | 'isDisabled'
> & {
  size: ButtonSize;
  width: ButtonWidthTypes | number;
};
