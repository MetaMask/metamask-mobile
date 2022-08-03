import { ViewStyle } from 'react-native';
import { ButtonProps } from '../Button';

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
export interface ButtonTertiaryProps extends Omit<ButtonProps, 'labelColor'> {
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
