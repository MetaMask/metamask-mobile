// Third party dependencies.
import { SelectValueProps } from '../../SelectValue/SelectValue.types';
import { TouchableOpacityProps } from '../../../../../components/Base/TouchableOpacity';

/**
 * SelectButtonBase component props.
 */
export interface SelectButtonBaseProps
  extends Omit<SelectValueProps, 'style'>,
    Omit<TouchableOpacityProps, 'hitSlop'> {
  /**
   * Optional enum to replace the caret Icon.
   */
  caretIconEl?: React.ReactNode;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
}
