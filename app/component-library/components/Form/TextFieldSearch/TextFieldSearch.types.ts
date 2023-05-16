// External dependencies.
import { TextFieldProps } from '../TextField/TextField.types';
import { ButtonIconProps } from '../../Buttons/ButtonIcon/ButtonIcon.types';

/**
 * TextFieldSearch component props.
 */
export interface TextFieldSearchProps extends TextFieldProps {
  /**
   * Optional boolean to show the Clear button.
   * @default false
   */
  showClearButton?: boolean;
  /**
   * Function to trigger when pressing the clear button.
   */
  onPressClearButton?: () => void;
  /**
   * Optional prop to pass any additional props to the clear button.
   */
  clearButtonProps?: ButtonIconProps;
}
