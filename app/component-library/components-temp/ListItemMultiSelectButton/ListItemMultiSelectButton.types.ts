// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { ListItemProps } from '../ListItem/ListItem.types';
import { IconName } from '../../Icons/Icon';
import { GestureResponderEvent } from 'react-native-modal';

/**
 * ListItemMultiSelect component props.
 */
export interface ListItemMultiSelectButtonProps
  extends TouchableOpacityProps,
    Omit<ListItemProps, 'style' | 'hitSlop'> {
  /**
   * Optional prop to determine if the item is selected.
   */
  isSelected?: boolean;
  /**
   * Optional prop to determine if the item is disabled.
   */
  isDisabled?: boolean;

  /**
   * Optional Button icon type.
   */
  buttonIcon?: IconName;

  /**
   * Optional button onClick function
   */
  onButtonClick?: ((event: GestureResponderEvent) => void) | undefined;
}

/**
 * Style sheet input parameters.
 */
export type ListItemMultiSelectButtonStyleSheetVars = Pick<
  ListItemMultiSelectButtonProps,
  'style' | 'isDisabled' | 'isSelected'
> & {
  gap: number | string | undefined;
};
