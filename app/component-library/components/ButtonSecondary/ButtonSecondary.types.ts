import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * Enum used to select between variants.
 */
export enum ButtonSecondaryVariant {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonSecondary component props.
 */
export interface ButtonSecondaryProps
  extends Omit<BaseButtonProps, 'labelColor'> {
  variant: ButtonSecondaryVariant;
}

/**
 * ButtonSecondary component style sheet.
 */
export interface ButtonSecondaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export interface ButtonSecondaryStyleSheetVars
  extends Pick<ButtonSecondaryProps, 'style' | 'variant'> {
  pressed: boolean;
}
