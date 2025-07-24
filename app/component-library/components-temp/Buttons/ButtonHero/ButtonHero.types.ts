// Internal dependencies.
import { ButtonBaseProps } from '../../../components/Buttons/Button/foundation/ButtonBase';

/**
 * ButtonHero component props.
 */
export interface ButtonHeroProps extends Omit<ButtonBaseProps, 'labelColor'> {}

/**
 * Style sheet input parameters.
 */
export type ButtonHeroStyleSheetVars = Pick<ButtonHeroProps, 'style'> & {
  pressed: boolean;
};