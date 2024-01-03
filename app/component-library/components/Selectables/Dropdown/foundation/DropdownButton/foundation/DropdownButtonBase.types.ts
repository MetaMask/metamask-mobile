// Third party dependencies.
import { ValueListItemProps } from '../../../../../ValueList/ValueListItem/ValueListItem.types';
import { TouchableOpacityProps } from 'react-native';

/**
 * DropdownButtonBase component props.
 */
export interface DropdownButtonBaseProps
  extends Omit<ValueListItemProps, 'style' | 'variant' | 'description'>,
    TouchableOpacityProps {
  /**
   * Optional enum to replace the caret Icon.
   */
  caretIconEl?: React.ReactNode;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
}
