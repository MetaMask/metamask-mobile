// External dependencies.
import { ListItemProps } from '../../../List/ListItem/ListItem.types';
import { ListItemSelectProps } from '../../../List/ListItemSelect/ListItemSelect.types';
import { ListItemMultiSelectProps } from '../../../List/ListItemMultiSelect/ListItemMultiSelect.types';
import { ValueListVariant } from '../../ValueList.types';

/**
 * ValueListItemBase component props.
 */
export interface ValueListItemBaseProps
  extends Omit<ListItemProps, 'style'>,
    ListItemSelectProps,
    ListItemMultiSelectProps {
  /**
   * Optional prop to select the ValueListItem variant
   */
  variant?: ValueListVariant;
  /**
   * Optional content to be displayed before the info section.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional content to be displayed in the info section.
   */
  children?: React.ReactNode;
  /**
   * Optional content to be displayed after the info section.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional prop for the test ID
   */
  testID?: string | undefined;
}
