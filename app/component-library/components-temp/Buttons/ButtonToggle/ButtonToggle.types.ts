// External dependencies.
import { ButtonBaseProps } from '../../../components/Buttons/Button/foundation/ButtonBase';
import { ButtonSize } from '../../../components/Buttons/Button';

/**
 * ButtonToggle component props.
 */
export type ButtonToggleProps = Omit<ButtonBaseProps, 'labelColor'> & {
  /**
   * Boolean indicating if the button is in active state.
   */
  isActive?: boolean;
};

/**
 * Style sheet input parameters.
 */
export type ButtonToggleStyleSheetVars = Pick<ButtonToggleProps, 'style'> & {
  isActive: boolean;
  size: ButtonSize;
};
