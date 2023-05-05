// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps, IconSize } from '../../Icons/Icon';

/**
 * Size variants of ButtonIcon.
 */
export enum ButtonIconSizes {
  Sm = '24',
  Lg = '32',
}

/**
 * Mapping of IconSize by ButtonIconSize.
 */
export type IconSizeByButtonIconSize = {
  [key in ButtonIconSizes]: IconSize;
};

/**
 * Variants of ButtonIcon.
 */
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
   * Optional enum to select between variants.
   * @default Primary
   */
  variant?: ButtonIconVariants;
  /**
   * Size of the buttonIcon.
   */
  size?: ButtonIconSizes;
  /**
   * Icon color to override
   */
  iconColorOverride?: string;
}

/**
 * Style sheet input parameters.
 */
export type ButtonIconStyleSheetVars = Pick<ButtonIconProps, 'style' | 'size'>;
