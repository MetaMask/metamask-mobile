// Internal dependencies.
import { ButtonBaseProps } from '../ButtonBase';

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
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  variant?: ButtonPrimaryVariant;
}

/**
 * Style sheet input parameters.
 */
export interface ButtonPrimaryStyleSheetVars
  extends Pick<ButtonPrimaryProps, 'style'> {
  variant: ButtonPrimaryVariant;
  pressed: boolean;
}
