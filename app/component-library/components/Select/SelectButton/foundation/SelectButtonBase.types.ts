// External dependencies.
import { ListItemProps } from '../../../List/ListItem/ListItem.types';
import { TouchableOpacityProps } from 'react-native';

/**
 * SelectButtonBase component props.
 */
export interface SelectButtonBaseProps
  extends Omit<ListItemProps, 'children' | 'style'>,
    TouchableOpacityProps {
  /**
   * Optional content to be displayed before the info section.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional content to be displayed in the info section.
   */
  children?: React.ReactNode;
  /**
   * Optional content to be displayed before the info section.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional enum to control the caret Icon.
   */
  caretIcon?: React.ReactNode;
}
