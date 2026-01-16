// Third party dependencies.
import { TouchableOpacityProps } from '../../../../components/Base/TouchableOpacity';

// External dependencies.
import { ListItemProps } from '../ListItem/ListItem.types';

/**
 * ListItemSelect component props.
 */
export interface ListItemSelectProps
  extends Omit<TouchableOpacityProps, 'hitSlop'>,
    Omit<ListItemProps, 'style'> {
  /**
   * Optional prop to determine if the item is selected.
   */
  isSelected?: boolean;
  /**
   * Optional prop to determine if the item is disabled.
   */
  isDisabled?: boolean;
  /**
   * Optional prop to configure the prop of nested ListItem
   */
  listItemProps?: Partial<ListItemProps>;
}

/**
 * Style sheet input parameters.
 */
export type ListItemSelectStyleSheetVars = Pick<
  ListItemSelectProps,
  'style' | 'isDisabled'
>;
