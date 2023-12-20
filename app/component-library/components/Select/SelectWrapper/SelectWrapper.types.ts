// External dependencies.
import { SelectValueProps } from '../SelectValue/SelectValue.types';
import { SelectButtonProps } from '../SelectButton/SelectButton.types';

// Internal dependencies.
import { SelectWrapperBaseProps } from './foundation/SelectWrapperBase.types';

/**
 * SelectWrapper component props.
 */
export interface SelectWrapperProps extends SelectWrapperBaseProps {
  /**
   * Optional enum for the placeholder string when there is no value selected
   */
  placeholder?: string;
  /**
   * Optional enum to display the selected value
   */
  value?: SelectValueProps;
  /**
   * Optional prop for the SelectButton
   */
  selectButtonProps?: SelectButtonProps;
}
