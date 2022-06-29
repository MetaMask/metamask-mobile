import { TouchableOpacityProps, ViewStyle } from 'react-native';
import { IconProps } from '../Icon/Icon.types';

export enum IconButtonVariant {
  Primary = 'Primary',
  Secondary = 'Secondary',
}

/**
 * IconButton component props.
 */
export interface IconButtonProps extends TouchableOpacityProps {
  /**
   * Icon to use.
   */
  icon: IconProps['name'];
  /**
   * Function to trigger when pressed.
   */
  onPress: () => void;
  /**
   * Enum to select between variants.
   */
  variant: IconButtonVariant;
}

/**
 * IconButton component style sheet.
 */
export interface IconButtonStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type IconButtonStyleSheetVars = Pick<IconButtonProps, 'style'>;
