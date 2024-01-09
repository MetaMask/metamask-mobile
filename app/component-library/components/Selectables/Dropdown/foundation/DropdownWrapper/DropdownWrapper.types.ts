// External dependencies.
import { ValueListItemProps } from '../../../../ValueList/ValueListItem/ValueListItem.types';
import { DropdownButtonProps } from '../DropdownButton/DropdownButton.types';

// Internal dependencies.
import { SelectableWrapperProps } from '../../../foundation/SelectableWrapper/SelectableWrapper.types';

/**
 * DropdownWrapper component props.
 */
export interface DropdownWrapperProps extends SelectableWrapperProps {
  /**
   * Optional enum for the placeholder string when there is no value Dropdowned
   */
  placeholder?: string;
  /**
   * Optional enum to display the Dropdowned value
   */
  value?: Omit<ValueListItemProps, 'variant' | 'description'>;
  /**
   * Optional prop for the DropdownButton
   */
  dropdownButtonProps?: DropdownButtonProps;
}
