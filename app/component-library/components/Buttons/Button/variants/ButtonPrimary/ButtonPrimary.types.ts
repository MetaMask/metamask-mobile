// Internal dependencies.
import { ButtonBaseProps } from '@component-library/components/Buttons/Button/foundation/ButtonBase';

/**
 * ButtonPrimary component props.
 */
export type ButtonPrimaryProps = Omit<ButtonBaseProps, 'labelColor'>;

/**
 * Style sheet input parameters.
 */
export type ButtonPrimaryStyleSheetVars = Pick<ButtonPrimaryProps, 'style'> & {
  isDanger: boolean;
  pressed: boolean;
};
