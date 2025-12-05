// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconName, IconSize, IconColor } from '../../Icons/Icon';

/**
 * Size variants of ButtonIcon.
 */
export enum ButtonIconSizes {
  Sm = '24',
  Md = '28',
  Lg = '32',
}

/**
 * Mapping of IconSize by ButtonIconSize.
 */
export type IconSizeByButtonIconSize = {
  [key in ButtonIconSizes]: IconSize;
};

/**
 * ButtonIcon component props.
 */
export interface ButtonIconProps extends TouchableOpacityProps {
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconName;
  /**
   * Optional prop to configure the size of the buttonIcon.
   */
  size?: ButtonIconSizes;
  /**
   * Optional prop for the color of the icon.
   */
  iconColor?: string | IconColor;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
  /**
   * Function to trigger when pressing the button.
   */
  onPress?: () => void;
}

/**
 * Style sheet input parameters.
 */
export type ButtonIconStyleSheetVars = Pick<
  ButtonIconProps,
  'style' | 'size'
> & {
  pressed: boolean;
  isDisabled: boolean;
};
