// External dependencies.
import { ButtonBaseProps } from '@component-library/components/Buttons/Button/foundation/ButtonBase';

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
