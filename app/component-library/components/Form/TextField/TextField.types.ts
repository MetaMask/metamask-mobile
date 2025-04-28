// External dependencies.
import { InputProps } from './foundation/Input/Input.types';
import { ViewStyle } from 'react-native';
/**
 * TextFieldSize.
 */
export enum TextFieldSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
}

/**
 * TextField component props.
 */
export interface TextFieldProps
  extends Omit<InputProps, 'textVariant' | 'disableStateStyles'> {
  /**
   * Optional prop for size of the TextField.
   * @default TextFieldSize.Md
   */
  size?: TextFieldSize;
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
   * Optional prop to style the input.
   */
  inputStyle?: ViewStyle;
}

/**
 * Style sheet TextField parameters.
 */
export type TextFieldStyleSheetVars = Pick<
  TextFieldProps,
  'style' | 'size' | 'isError' | 'isDisabled'
> & {
  isFocused: boolean;
};
