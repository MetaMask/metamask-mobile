// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../Icon/Icon.types';

export enum ButtonIconVariant {
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
   * Optional enum to select between variants.
   * @default Primary
   */
  variant?: ButtonIconVariant;
}

/**
 * Style sheet input parameters.
 */
export type ButtonIconStyleSheetVars = Pick<ButtonIconProps, 'style'>;
