// External dependencies.
import { TextFieldProps } from '../TextField/TextField.types';
import { ButtonIconProps } from '../../Buttons/ButtonIcon/ButtonIcon.types';

interface BaseTextFieldSearchProps extends TextFieldProps {
  /**
   * Optional prop to pass any additional props to the clear button.
   */
  clearButtonProps?: Partial<ButtonIconProps>;
}

interface HideClearButtonTextFieldSearchProps extends BaseTextFieldSearchProps {
  /**
   * Optional boolean to show the Clear button.
   * @default false
   */
  showClearButton?: false;
  /**
   * Function to trigger when pressing the clear button.
   */
  onPressClearButton?: () => void;
}

interface ShowClearButtonTextFieldSearchProps extends BaseTextFieldSearchProps {
  /**
   * Show the Clear button.
   */
  showClearButton: true;
  /**
   * Function to trigger when pressing the clear button.
   */
  onPressClearButton: () => void;
}

/**
 * TextFieldSearch component props.
 */
export type TextFieldSearchProps =
  | HideClearButtonTextFieldSearchProps
  | ShowClearButtonTextFieldSearchProps;
