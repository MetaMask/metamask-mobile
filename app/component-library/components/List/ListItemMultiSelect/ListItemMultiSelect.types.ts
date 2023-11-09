// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { ListItemProps } from '../../List/ListItem/ListItem.types';

/**
 * ListItemMultiSelect component props.
 */
export interface ListItemMultiSelectProps
  extends TouchableOpacityProps,
    Omit<ListItemProps, 'style'> {
  /**
   * Optional prop to determine if the item is selected.
   */
  isSelected?: boolean;
  /**
   * Optional prop to determine if the item is disabled.
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type ListItemMultiSelectStyleSheetVars = Pick<
  ListItemMultiSelectProps,
  'style' | 'isDisabled'
> & {
  gap: number | string | undefined;
};
