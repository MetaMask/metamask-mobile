// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../../../Icon/Icon.types';
import { ButtonVariants } from '../../Button.types';

export enum ButtonIconVariants {
  Primary = 'Primary',
  Secondary = 'Secondary',
}

/**
 * ButtonIcon component props.
 */
export interface ButtonIconProps extends TouchableOpacityProps {
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconProps['name'];
  /**
   * Function to trigger when pressed.
   */
  onPress: () => void;
  /**
   * Variant of Button
   */
  variant?: ButtonVariants.Icon;
  /**
   * Optional enum to select between variants.
   * @default Primary
   */
  buttonIconVariants?: ButtonIconVariants;
}

/**
 * Style sheet input parameters.
 */
export type ButtonIconStyleSheetVars = Pick<ButtonIconProps, 'style'>;
