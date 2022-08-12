// External dependencies.
import { ButtonBaseProps } from '../ButtonBase';

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
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  variant?: ButtonSecondaryVariant;
}

/**
 * Style sheet input parameters.
 */
export interface ButtonSecondaryStyleSheetVars
  extends Pick<ButtonSecondaryProps, 'style'> {
  variant: ButtonSecondaryVariant;
  pressed: boolean;
}
