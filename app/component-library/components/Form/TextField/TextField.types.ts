// External dependencies.
import { InputProps } from './foundation/Input/Input.types';

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
  error?: boolean;
}
