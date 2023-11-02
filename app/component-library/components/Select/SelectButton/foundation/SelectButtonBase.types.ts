// Third party dependencies.
import { SelectValueProps } from '../../SelectValue/SelectValue.types';

import { TouchableOpacityProps } from 'react-native';
// External dependencies.

/**
 * SelectButtonBase component props.
 */
export interface SelectButtonBaseProps
  extends Omit<SelectValueProps, 'style'>,
    TouchableOpacityProps {
  /**
   * Optional enum to control the caret Icon.
   */
  caretIcon?: React.ReactNode;
}
