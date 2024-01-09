// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * BaseSelectableButton component props.
 */
export interface BaseSelectableButtonProps extends TouchableOpacityProps {
  /**
   * Optional enum to replace the caret Icon.
   */
  caretIconEl?: React.ReactNode;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
  /**
   * Optional prop to configure the danger state.
   */
  isDanger?: boolean;
  /**
   * Optional enum for the placeholder string when there is no value selected
   */
  placeholder?: string;
}
