// External dependencies.
import { ButtonBaseProps } from '../ButtonBase';

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
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  variant?: ButtonTertiaryVariant;
}

/**
 * Style sheet input parameters.
 */
export type ButtonTertiaryStyleSheetVars = Pick<ButtonTertiaryProps, 'style'>;
