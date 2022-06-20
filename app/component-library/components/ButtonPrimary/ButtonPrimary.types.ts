import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * ButtonPrimary variant
 */
export enum ButtonPrimaryVariant {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonPrimary component props.
 */
export interface ButtonPrimaryProps
  extends Omit<BaseButtonProps, 'labelColor'> {
  variant: ButtonPrimaryVariant;
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
export interface ButtonPrimaryStyleSheetVars
  extends Pick<ButtonPrimaryProps, 'style' | 'variant'> {
  pressed: boolean;
}
