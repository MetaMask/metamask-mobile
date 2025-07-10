// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonSecondary component props.
 */
export interface ButtonSecondaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional prop to make the button use danger colors.
   * @default false
   */
  isDanger?: boolean;
  /**
   * Optional prop to make the button use inverse colors.
   * @default false
   */
  isInverse?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type ButtonSecondaryStyleSheetVars = Pick<
  ButtonSecondaryProps,
  'style'
> & {
  isDanger: boolean;
  isInverse: boolean;
  pressed: boolean;
};
