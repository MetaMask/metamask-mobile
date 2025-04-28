// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonSecondary component props.
 */
export type ButtonSecondaryProps = Omit<ButtonBaseProps, 'labelColor'> & {
  overridePressedColor?: string;
};

/**
 * Style sheet input parameters.
 */
export type ButtonSecondaryStyleSheetVars = Pick<
  ButtonSecondaryProps,
  'style'
> & {
  isDanger: boolean;
  pressed: boolean;
  overridePressedColor?: string;
};
