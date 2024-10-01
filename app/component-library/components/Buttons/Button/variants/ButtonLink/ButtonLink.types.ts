// External dependencies.
import { ButtonBaseProps } from '@component-library/components/Buttons/Button/foundation/ButtonBase';

/**
 * ButtonLink component props.
 */
export type ButtonLinkProps = Omit<ButtonBaseProps, 'labelColor'>;

/**
 * Style sheet input parameters.
 */
export type ButtonLinkStyleSheetVars = Pick<ButtonLinkProps, 'style'> & {
  isDanger: boolean;
  pressed: boolean;
};
