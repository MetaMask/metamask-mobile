// External dependencies.
import { ButtonPrimaryProps } from '../../../components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.types';

/**
 * ButtonToggle component props.
 */
export type ButtonToggleProps = ButtonPrimaryProps & {
  /**
   * Boolean indicating if the button is in active state.
   */
  isActive?: boolean;
};
