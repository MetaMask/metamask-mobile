import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * Enum used to select between variants.
 */
export enum ButtonTertiaryVariant {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonTertiary component props.
 */
export interface ButtonTertiaryProps
  extends Omit<BaseButtonProps, 'labelColor'> {
  variant: ButtonTertiaryVariant;
}

/**
 * ButtonTertiary component style sheet.
 */
export interface ButtonTertiaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonTertiaryStyleSheetVars = Pick<
  ButtonTertiaryProps,
  'style' | 'variant'
>;
