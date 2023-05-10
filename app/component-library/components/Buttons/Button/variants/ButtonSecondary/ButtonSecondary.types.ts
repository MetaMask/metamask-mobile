// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonSecondary component props.
 */
export type ButtonSecondaryProps = Omit<ButtonBaseProps, 'labelColor'>;

/**
 * Style sheet input parameters.
 */
export type ButtonSecondaryStyleSheetVars = Pick<
  ButtonSecondaryProps,
  'style'
> & {
  isDanger: boolean;
  pressed: boolean;
};
