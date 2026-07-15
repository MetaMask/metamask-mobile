// External dependencies.
import { InputProps } from './foundation/Input/Input.types';

/**
 * TextField component props.
 */
export interface TextFieldProps
  extends Omit<InputProps, 'textVariant' | 'disableStateStyles'> {
  /**
   * Optional content to display before the Input.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional content to display after the Input.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional boolean to show the error state.
   * @default false
   */
  isError?: boolean;
  /**
   * Optional prop to replace defaulted input with custom Input.
   */
  inputElement?: React.ReactNode;
  /**
   * Optional test ID for the input element.
   */
  testID?: string;
}

/**
 * Style sheet TextField parameters.
 */
export type TextFieldStyleSheetVars = Pick<
  TextFieldProps,
  'style' | 'isError' | 'isDisabled'
> & {
  isFocused: boolean;
};
