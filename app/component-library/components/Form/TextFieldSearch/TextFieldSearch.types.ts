// External dependencies.
import { TextFieldProps } from '../TextField/TextField.types';
import { ButtonIconProps } from '../../Buttons/ButtonIcon/ButtonIcon.types';

/**
 * TextFieldSearch component props.
 */
export interface TextFieldSearchProps extends TextFieldProps {
  /**
   * Optional prop to pass any additional props to the clear button.
   */
  clearButtonProps?: ButtonIconProps;
  /**
   * Function to trigger when pressing the clear button.
   * The clear button is automatically shown when the input has a value.
   */
  onPressClearButton: () => void;
}
