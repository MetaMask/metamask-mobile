// Third party dependencies.
import { SelectValueProps } from '../../SelectValue/SelectValue.types';
import { TouchableOpacityProps } from 'react-native';

/**
 * SelectButtonBase component props.
 */
export interface SelectButtonBaseProps
  extends Omit<SelectValueProps, 'style'>,
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
