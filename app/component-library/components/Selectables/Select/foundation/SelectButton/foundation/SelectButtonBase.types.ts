// Third party dependencies.
import { ValueListItemProps } from '../../../../../ValueList/ValueListItem/ValueListItem.types';
import { TouchableOpacityProps } from 'react-native';

/**
 * SelectButtonBase component props.
 */
export interface SelectButtonBaseProps
  extends Omit<ValueListItemProps, 'style' | 'variant'>,
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
