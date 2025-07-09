// Internal dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonPrimary component props.
 */
export interface ButtonPrimaryProps
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
export type ButtonPrimaryStyleSheetVars = Pick<ButtonPrimaryProps, 'style'> & {
  isDanger: boolean;
  isInverse: boolean;
  pressed: boolean;
};
