// Third party dependencies.
import { TextInputProps } from 'react-native';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';

/**
 * Input component props.
 */
export interface InputProps extends Omit<TextInputProps, 'editable'> {
  /**
   * Optional enum to select between Typography variants.
   * @default BodyMD
   */
  textVariant?: TextVariant;
  /**
   * Optional boolean to disable Input.
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Optional boolean to show readonly input.
   * @default false
   */
  isReadonly?: boolean;
  /**
   * Optional boolean to disable state styles.
   * @default false
   */
  isStateStylesDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type InputStyleSheetVars = Pick<
  InputProps,
  'style' | 'isStateStylesDisabled' | 'isDisabled'
> & {
  isFocused: boolean;
  textVariant: TextVariant;
};
