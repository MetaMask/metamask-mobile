// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { ListItemProps } from '../../../List/ListItem/ListItem.types';

/**
 * SelectItem component props.
 */
export interface SelectItemProps extends TouchableOpacityProps, ListItemProps {
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
export type SelectItemStyleSheetVars = Pick<
  SelectItemProps,
  'style' | 'isDisabled'
>;
