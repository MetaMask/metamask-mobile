// Third party dependencies.
import { ValueListItemProps } from '../../../ValueList/ValueListItem/ValueListItem.types';
import { TouchableOpacityProps } from 'react-native';

/**
 * SelectableButton component props.
 */
export interface SelectableButtonProps
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
  SkinComponent?: React.FunctionComponent<any>;
}
