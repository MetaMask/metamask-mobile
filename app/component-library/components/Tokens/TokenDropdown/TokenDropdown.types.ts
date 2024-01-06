// External dependencies.
import { DropdownProps } from '../../Selectables/Dropdown/Dropdown.types';
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';

/**
 * TokenDropdown component props.
 */
export interface TokenDropdownProps extends DropdownProps {
  value?: TokenListItemProps;
  options: TokenListItemProps[];
}
