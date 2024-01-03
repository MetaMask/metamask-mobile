// External dependencies.
import { ValueListItemProps } from '../../../../ValueList/ValueListItem/ValueListItem.types';
import { SelectButtonProps } from '../SelectButton/SelectButton.types';

// Internal dependencies.
import { SelectableWrapperProps } from '../../../foundation/SelectableWrapper/SelectableWrapper.types';

/**
 * SelectWrapper component props.
 */
export interface SelectWrapperProps extends SelectableWrapperProps {
  /**
   * Optional enum for the placeholder string when there is no value selected
   */
  placeholder?: string;
  /**
   * Optional enum to display the selected value
   */
  value?: Omit<ValueListItemProps, 'variant'>;
  /**
   * Optional prop for the SelectButton
   */
  selectButtonProps?: SelectButtonProps;
}
