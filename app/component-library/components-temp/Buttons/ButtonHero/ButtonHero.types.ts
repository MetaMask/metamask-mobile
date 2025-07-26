// Third party dependencies.
import { ButtonBaseProps } from '../../../components/Buttons/Button/foundation/ButtonBase';

/**
 * ButtonHero component props.
 */
export interface ButtonHeroProps extends Omit<ButtonBaseProps, 'labelColor'> {
  // All props inherited from ButtonBaseProps
  // labelColor is omitted since we set it internally for the hero styling
}
